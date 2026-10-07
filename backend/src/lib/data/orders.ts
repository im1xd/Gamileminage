import { query, tx } from '../db';
import { camelize } from '../camel';
import { ApiError, escapeLike, notFound, paging } from '../http';
import type { OrderStatus } from '../constants';
import { canTransition, isFinalStatus } from '../order-status';
import type { OrderCreateInput, OrderUpdateInput } from '../validators';
import { pages, param } from './shared';

interface LockedProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  track_stock: boolean;
  is_active: boolean;
  image: string | null;
}

interface LockedVariant {
  id: string;
  product_id: string;
  size: string;
  color: string;
  price: number | null;
  stock: number;
  image_public_id: string | null;
  is_active: boolean;
}

interface Line {
  p: LockedProduct;
  v: LockedVariant | null;
  qty: number;
  unitPrice: number;
  label: string;
}

const variantLabel = (v: { size: string; color: string }) =>
  [v.color && `اللون: ${v.color}`, v.size && `الحجم: ${v.size}`].filter(Boolean).join(' — ');

/**
 * Creates an order atomically. Prices and shipping come from the DATABASE — the client only sends
 * product ids, option ids and quantities — and product/option rows are locked so two buyers can't oversell the last piece.
 */
export async function createOrder(input: OrderCreateInput, ipHash: string) {
  const wanted = new Map<string, { productId: string; variantId: string | null; qty: number }>();
  for (const item of input.items) {
    const key = `${item.productId}|${item.variantId ?? ''}`;
    const prev = wanted.get(key);
    wanted.set(key, { productId: item.productId, variantId: item.variantId, qty: Math.min(100, (prev?.qty ?? 0) + item.quantity) });
  }
  const productIds = [...new Set([...wanted.values()].map((w) => w.productId))];

  return tx(async (t) => {
    const products = await t.query<LockedProduct>(
      `SELECT p.id, p.name, p.price, p.stock, p.track_stock, p.is_active,
              (SELECT pi.public_id FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order, pi.created_at LIMIT 1) AS image
       FROM products p WHERE p.id = ANY($1::uuid[]) ORDER BY p.id FOR UPDATE OF p`,
      [productIds],
    );
    const variants = await t.query<LockedVariant>(
      `SELECT v.id, v.product_id, v.size, v.color, v.price, v.stock, v.image_public_id, v.is_active
       FROM product_variants v WHERE v.product_id = ANY($1::uuid[]) ORDER BY v.id FOR UPDATE`,
      [productIds],
    );
    const byId = new Map(products.map((p) => [p.id, p]));
    const optionsOf = (productId: string) => variants.filter((v) => v.product_id === productId && v.is_active);

    const lines: Line[] = [];
    let subtotal = 0;
    for (const w of wanted.values()) {
      const p = byId.get(w.productId);
      if (!p || !p.is_active) throw new ApiError(409, 'أحد المنتجات لم يعد متوفرًا، حدّث السلة وحاول مجددًا', 'product_unavailable');
      const options = optionsOf(p.id);
      let v: LockedVariant | null = null;
      if (options.length > 0) {
        if (!w.variantId) throw new ApiError(422, `اختر اللون أو الحجم للمنتج «${p.name}»`, 'variant_required');
        v = options.find((o) => o.id === w.variantId) ?? null;
        if (!v) throw new ApiError(409, `الخيار المختار من «${p.name}» لم يعد متوفرًا، حدّث السلة`, 'product_unavailable');
      } else if (w.variantId) {
        throw new ApiError(409, `«${p.name}» تغيّرت خياراته، حدّث السلة وحاول مجددًا`, 'product_unavailable');
      }
      const available = v ? v.stock : p.stock;
      const label = v ? variantLabel(v) : '';
      const shown = label ? `${p.name} (${label})` : p.name;
      if (p.track_stock && available < w.qty) {
        throw new ApiError(409, available === 0 ? `نفدت كمية «${shown}»` : `المتوفر من «${shown}» ${available} قطعة فقط`, 'insufficient_stock');
      }
      const unitPrice = v?.price ?? p.price;
      subtotal += unitPrice * w.qty;
      lines.push({ p, v, qty: w.qty, unitPrice, label });
    }

    const rate = (await t.query<{ wilaya_name: string; price: number | null; is_active: boolean }>(
      `SELECT wilaya_name, price, is_active FROM shipping_rates WHERE wilaya_code = $1::int`,
      [input.wilayaCode],
    ))[0];
    if (!rate || !rate.is_active) throw new ApiError(422, 'التوصيل غير متاح لهذه الولاية حاليًا', 'shipping_unavailable');
    const shippingPending = rate.price === null;
    const shippingFee = rate.price ?? 0;
    const total = subtotal + shippingFee;

    const seq = (await t.query<{ n: string }>(`SELECT nextval('order_number_seq')::text AS n`))[0].n;
    const orderNumber = `GM-${seq}`;
    const order = (await t.query<{ id: string }>(
      `INSERT INTO orders (order_number, customer_name, phone, wilaya_code, wilaya_name, commune, address, customer_note,
                           subtotal, shipping_fee, shipping_pending, total, ip_hash)
       VALUES ($1::text, $2::text, $3::text, $4::int, $5::text, $6::text, $7::text, $8::text,
               $9::int, $10::int, $11::boolean, $12::int, $13::text)
       RETURNING id`,
      [orderNumber, input.customerName, input.phone, input.wilayaCode, rate.wilaya_name, input.commune, input.address, input.note, subtotal, shippingFee, shippingPending, total, ipHash],
    ))[0];

    await t.query(
      `INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_label, image_public_id, unit_price, quantity)
       SELECT $1::uuid, x.pid, x.vid, x.pname, x.vlabel, x.img, x.price, x.qty
       FROM unnest($2::uuid[], $3::uuid[], $4::text[], $5::text[], $6::text[], $7::int[], $8::int[]) AS x(pid, vid, pname, vlabel, img, price, qty)`,
      [order.id, lines.map((l) => l.p.id), lines.map((l) => l.v?.id ?? null), lines.map((l) => l.p.name), lines.map((l) => l.label), lines.map((l) => l.v?.image_public_id ?? l.p.image), lines.map((l) => l.unitPrice), lines.map((l) => l.qty)],
    );

    // Stock: option lines decrement the option; plain lines decrement the product. sold_count counts every piece.
    const optionLines = lines.filter((l) => l.v);
    if (optionLines.length) {
      await t.query(
        `UPDATE product_variants v SET stock = v.stock - x.qty
         FROM unnest($1::uuid[], $2::int[]) AS x(vid, qty), products p
         WHERE v.id = x.vid AND p.id = v.product_id AND p.track_stock = true`,
        [optionLines.map((l) => l.v?.id), optionLines.map((l) => l.qty)],
      );
    }
    const sold = new Map<string, { sold: number; plain: number }>();
    for (const l of lines) {
      const cur = sold.get(l.p.id) ?? { sold: 0, plain: 0 };
      cur.sold += l.qty;
      if (!l.v) cur.plain += l.qty;
      sold.set(l.p.id, cur);
    }
    const ids = [...sold.keys()];
    await t.query(
      `UPDATE products SET
         stock = CASE WHEN products.track_stock THEN products.stock - x.plain ELSE products.stock END,
         sold_count = products.sold_count + x.sold, updated_at = now()
       FROM unnest($1::uuid[], $2::int[], $3::int[]) AS x(pid, sold, plain)
       WHERE products.id = x.pid`,
      [ids, ids.map((id) => sold.get(id)?.sold ?? 0), ids.map((id) => sold.get(id)?.plain ?? 0)],
    );

    await t.query(`INSERT INTO order_status_history (order_id, status, note) VALUES ($1::uuid, 'new', 'تم استلام الطلب')`, [order.id]);
    await t.query(
      `INSERT INTO notifications (type, title, body, link) VALUES ('order', $1::text, $2::text, $3::text)`,
      [`طلب جديد ${orderNumber}`, `${input.customerName} — ${rate.wilaya_name} — ${total.toLocaleString('en-US')} دج`, `/admin/orders/${order.id}`],
    );
    return { orderNumber, subtotal, shippingFee, shippingPending, total };
  });
}

/** Customer-facing lookup: the order number AND the phone it was placed with must both match. */
export async function trackOrder(orderNumber: string, phone: string) {
  const order = (await query(
    `SELECT o.id, o.order_number, o.status, o.subtotal, o.shipping_fee, o.shipping_pending, o.total, o.wilaya_name, o.created_at
     FROM orders o WHERE o.order_number = $1::text AND o.phone = $2::text`,
    [orderNumber.toUpperCase(), phone],
  ))[0];
  if (!order) throw notFound('لم نجد طلبًا بهذه البيانات');
  const [items, history] = await Promise.all([
    query(`SELECT product_name, variant_label, quantity, unit_price FROM order_items WHERE order_id = $1::uuid ORDER BY product_name`, [order.id]),
    query(`SELECT status, created_at FROM order_status_history WHERE order_id = $1::uuid ORDER BY created_at`, [order.id]),
  ]);
  const { id: _id, ...safe } = order;
  void _id;
  return camelize({ ...safe, items, history });
}

/* ------------------------------------------------------------------ admin */

export async function listAdminOrders(f: { q?: string; status: string; page: number; limit: number }) {
  const params: unknown[] = [];
  const where: string[] = ['TRUE'];
  if (f.status !== 'all') where.push(`o.status = ${param(params, f.status)}::text`);
  if (f.q?.trim()) {
    const ph = param(params, `%${escapeLike(f.q.trim())}%`);
    where.push(`(o.order_number ILIKE ${ph}::text OR o.customer_name ILIKE ${ph}::text OR o.phone ILIKE ${ph}::text OR o.wilaya_name ILIKE ${ph}::text)`);
  }
  const whereSql = where.join(' AND ');
  const { limit, offset } = paging(f.page, f.limit);
  const filterParams = [...params];
  const limitPh = param(params, limit);
  const offsetPh = param(params, offset);

  const [rows, count, byStatus] = await Promise.all([
    query(
      `SELECT o.id, o.order_number, o.status, o.customer_name, o.phone, o.wilaya_name, o.total, o.shipping_pending, o.created_at,
              (SELECT COALESCE(SUM(oi.quantity), 0)::int FROM order_items oi WHERE oi.order_id = o.id) AS items_count
       FROM orders o WHERE ${whereSql}
       ORDER BY o.created_at DESC, o.id
       LIMIT ${limitPh}::int OFFSET ${offsetPh}::int`,
      params,
    ),
    query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM orders o WHERE ${whereSql}`, filterParams),
    query<{ status: string; n: number }>(`SELECT status, COUNT(*)::int AS n FROM orders GROUP BY status`),
  ]);
  const total = count[0]?.n ?? 0;
  const counts: Record<string, number> = {};
  for (const r of byStatus) counts[r.status] = r.n;
  return { items: camelize(rows), total, page: f.page, limit, pages: pages(total, limit), counts };
}

export async function getAdminOrder(id: string) {
  const order = (await query(`SELECT * FROM orders WHERE id = $1::uuid`, [id]))[0];
  if (!order) throw notFound('الطلب غير موجود');
  const [items, history] = await Promise.all([
    query(
      `SELECT oi.id, oi.product_id, oi.product_name, oi.variant_label, oi.image_public_id, oi.unit_price, oi.quantity, oi.line_total
       FROM order_items oi WHERE oi.order_id = $1::uuid ORDER BY oi.product_name`,
      [id],
    ),
    query(
      `SELECT h.id, h.status, h.note, h.created_at, a.display_name AS admin_name
       FROM order_status_history h LEFT JOIN admins a ON a.id = h.admin_id
       WHERE h.order_id = $1::uuid ORDER BY h.created_at`,
      [id],
    ),
  ]);
  const { ip_hash: _ip, ...safe } = order;
  void _ip;
  return camelize({ ...safe, items, history });
}

export async function updateOrder(id: string, adminId: string, input: OrderUpdateInput): Promise<void> {
  await tx(async (t) => {
    const order = (await t.query<{ status: OrderStatus; subtotal: number; shipping_fee: number }>(
      `SELECT status, subtotal, shipping_fee FROM orders WHERE id = $1::uuid FOR UPDATE`,
      [id],
    ))[0];
    if (!order) throw notFound('الطلب غير موجود');
    const isFinal = isFinalStatus(order.status);

    let nextStatus = order.status;
    if (input.status && input.status !== order.status) {
      if (!canTransition(order.status, input.status)) {
        throw new ApiError(409, isFinal ? 'الطلب الملغى أو المرتجع لا يمكن تغيير حالته' : 'لا يمكن الانتقال إلى هذه الحالة', 'invalid_transition');
      }
      nextStatus = input.status;
      if (isFinalStatus(nextStatus)) {
        // Cancelled / returned goods go back on the shelf (options and plain products separately; one row per product).
        await t.query(
          `UPDATE product_variants v SET stock = v.stock + oi.quantity
           FROM order_items oi JOIN products p ON p.id = oi.product_id
           WHERE oi.order_id = $1::uuid AND oi.variant_id = v.id AND p.track_stock = true`,
          [id],
        );
        await t.query(
          `UPDATE products p SET
             stock = CASE WHEN p.track_stock THEN p.stock + oi.plain_qty ELSE p.stock END,
             sold_count = GREATEST(0, p.sold_count - oi.qty), updated_at = now()
           FROM (SELECT product_id, SUM(quantity)::int AS qty,
                        SUM(CASE WHEN variant_id IS NULL THEN quantity ELSE 0 END)::int AS plain_qty
                 FROM order_items WHERE order_id = $1::uuid AND product_id IS NOT NULL
                 GROUP BY product_id) oi
           WHERE oi.product_id = p.id`,
          [id],
        );
      }
    }

    let fee = order.shipping_fee;
    let feeChanged = false;
    if (input.shippingFee !== undefined && input.shippingFee !== order.shipping_fee) {
      if (isFinal) throw new ApiError(409, 'لا يمكن تعديل التوصيل بعد الإلغاء أو الإرجاع', 'invalid_transition');
      fee = input.shippingFee;
      feeChanged = true;
    }

    await t.query(
      `UPDATE orders SET status = $2::text,
              admin_note = COALESCE($3::text, admin_note),
              shipping_fee = $4::int,
              shipping_pending = CASE WHEN $5::boolean THEN false ELSE shipping_pending END,
              total = subtotal + $4::int,
              updated_at = now()
       WHERE id = $1::uuid`,
      [id, nextStatus, input.adminNote ?? null, fee, feeChanged],
    );
    if (nextStatus !== order.status) {
      await t.query(`INSERT INTO order_status_history (order_id, status, note, admin_id) VALUES ($1::uuid, $2::text, $3::text, $4::uuid)`, [id, nextStatus, input.note, adminId]);
    }
  });
}
