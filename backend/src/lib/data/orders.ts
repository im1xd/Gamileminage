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

/**
 * Creates an order atomically. Prices and shipping come from the DATABASE — the client only sends
 * product ids and quantities — and product rows are locked so two buyers can't oversell the last piece.
 */
export async function createOrder(input: OrderCreateInput, ipHash: string) {
  const wanted = new Map<string, number>();
  for (const item of input.items) wanted.set(item.productId, Math.min(100, (wanted.get(item.productId) ?? 0) + item.quantity));
  const ids = [...wanted.keys()];

  return tx(async (t) => {
    const products = await t.query<LockedProduct>(
      `SELECT p.id, p.name, p.price, p.stock, p.track_stock, p.is_active,
              (SELECT pi.public_id FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order, pi.created_at LIMIT 1) AS image
       FROM products p WHERE p.id = ANY($1::uuid[]) ORDER BY p.id FOR UPDATE OF p`,
      [ids],
    );
    const byId = new Map(products.map((p) => [p.id, p]));
    let subtotal = 0;
    for (const [productId, qty] of wanted) {
      const p = byId.get(productId);
      if (!p || !p.is_active) throw new ApiError(409, 'أحد المنتجات لم يعد متوفرًا، حدّث السلة وحاول مجددًا', 'product_unavailable');
      if (p.track_stock && p.stock < qty) {
        throw new ApiError(409, p.stock === 0 ? `نفدت كمية «${p.name}»` : `المتوفر من «${p.name}» ${p.stock} قطعة فقط`, 'insufficient_stock');
      }
      subtotal += p.price * qty;
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

    const lines = ids.map((id) => ({ p: byId.get(id) as LockedProduct, qty: wanted.get(id) as number }));
    await t.query(
      `INSERT INTO order_items (order_id, product_id, product_name, image_public_id, unit_price, quantity)
       SELECT $1::uuid, x.pid, x.pname, x.img, x.price, x.qty
       FROM unnest($2::uuid[], $3::text[], $4::text[], $5::int[], $6::int[]) AS x(pid, pname, img, price, qty)`,
      [order.id, lines.map((l) => l.p.id), lines.map((l) => l.p.name), lines.map((l) => l.p.image), lines.map((l) => l.p.price), lines.map((l) => l.qty)],
    );
    await t.query(
      `UPDATE products SET
         stock = CASE WHEN products.track_stock THEN products.stock - x.qty ELSE products.stock END,
         sold_count = products.sold_count + x.qty, updated_at = now()
       FROM unnest($1::uuid[], $2::int[]) AS x(pid, qty)
       WHERE products.id = x.pid`,
      [lines.map((l) => l.p.id), lines.map((l) => l.qty)],
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
    query(`SELECT product_name, quantity, unit_price FROM order_items WHERE order_id = $1::uuid ORDER BY product_name`, [order.id]),
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
      `SELECT oi.id, oi.product_id, oi.product_name, oi.image_public_id, oi.unit_price, oi.quantity, oi.line_total
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
        // Cancelled / returned goods go back on the shelf.
        await t.query(
          `UPDATE products p SET
             stock = CASE WHEN p.track_stock THEN p.stock + oi.quantity ELSE p.stock END,
             sold_count = GREATEST(0, p.sold_count - oi.quantity), updated_at = now()
           FROM order_items oi WHERE oi.order_id = $1::uuid AND oi.product_id = p.id`,
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
