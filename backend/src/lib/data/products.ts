import { query, tx, type Tx } from '../db';
import { camelize } from '../camel';
import { ApiError, escapeLike, notFound, paging } from '../http';
import { decodeParam, slugify } from '../slug';
import { deleteImages } from '../cloudinary';
import type { ProductInput, VariantInput } from '../validators';
import { pages, param, uniqueSlug } from './shared';

/* Every query below avoids aggregate functions in the outer SELECT (images come from correlated
   sub-selects), so there is no GROUP BY to get wrong — the bug that bit the previous project. */

/** One row per product, even with zero options: totals over the ACTIVE colour/size options (no outer GROUP BY needed). */
const VX = `LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS n,
           COALESCE(SUM(v.stock), 0)::int AS stock,
           MIN(COALESCE(v.price, p.price)) AS min_price,
           MAX(COALESCE(v.price, p.price)) AS max_price,
           COALESCE(BOOL_OR(v.price IS NOT NULL), false) AS has_price
    FROM product_variants v WHERE v.product_id = p.id AND v.is_active = true
  ) vx ON true`;

// Effective values: when a product has options, price/stock come from the options.
const EFF_PRICE = 'COALESCE(vx.min_price, p.price)';
const EFF_STOCK = '(CASE WHEN vx.n > 0 THEN vx.stock ELSE p.stock END)';

const CARD_COLUMNS = `
  p.id, p.name, p.slug, ${EFF_PRICE} AS price,
  COALESCE(vx.n > 0 AND vx.min_price <> vx.max_price, false) AS price_from,
  COALESCE(vx.n > 0, false) AS has_options,
  (CASE WHEN vx.has_price THEN NULL ELSE p.compare_at_price END) AS compare_at_price,
  p.is_featured,
  COALESCE(NOT p.track_stock OR ${EFF_STOCK} > 0, false)               AS in_stock,
  COALESCE(p.track_stock AND ${EFF_STOCK} BETWEEN 1 AND 5, false)      AS low_stock,
  c.name AS category_name, c.slug AS category_slug,
  COALESCE((SELECT json_agg(x.public_id ORDER BY x.sort_order, x.created_at)
            FROM (SELECT pi.public_id, pi.sort_order, pi.created_at FROM product_images pi
                  WHERE pi.product_id = p.id ORDER BY pi.sort_order, pi.created_at LIMIT 2) x), '[]'::json) AS images`;

const SORTS: Record<string, string> = {
  newest: 'p.created_at DESC, p.id',
  price_asc: `${EFF_PRICE} ASC, p.id`,
  price_desc: `${EFF_PRICE} DESC, p.id`,
  popular: 'p.sold_count DESC, p.created_at DESC, p.id',
};

export interface PublicProductFilter {
  category?: string;
  q?: string;
  sort: string;
  featured?: string;
  onSale?: string;
  page: number;
  limit: number;
}

export async function listPublicProducts(f: PublicProductFilter) {
  const params: unknown[] = [];
  const where: string[] = ['p.is_active = true'];
  let cte = '';
  if (f.category) {
    const ph = param(params, decodeParam(f.category));
    // UNION (not UNION ALL) so a corrupted parent loop can never recurse forever.
    cte = `WITH RECURSIVE tree AS (
             SELECT id FROM categories WHERE slug = ${ph}::text AND is_active = true
             UNION
             SELECT c.id FROM categories c JOIN tree t ON c.parent_id = t.id WHERE c.is_active = true
           ) `;
    where.push('p.category_id IN (SELECT id FROM tree)');
  }
  if (f.q?.trim()) {
    const ph = param(params, `%${escapeLike(f.q.trim())}%`);
    where.push(`(p.name ILIKE ${ph}::text OR p.brand ILIKE ${ph}::text OR p.sku ILIKE ${ph}::text)`);
  }
  if (f.featured) where.push('p.is_featured = true');
  if (f.onSale) where.push('(p.compare_at_price IS NOT NULL AND p.compare_at_price > p.price AND NOT vx.has_price)');
  const whereSql = where.join(' AND ');
  const { limit, offset } = paging(f.page, f.limit);
  const filterParams = [...params];
  const limitPh = param(params, limit);
  const offsetPh = param(params, offset);
  const order = SORTS[f.sort] ?? SORTS.newest;

  const [rows, count] = await Promise.all([
    query(
      `${cte}SELECT ${CARD_COLUMNS}
       FROM products p ${VX} LEFT JOIN categories c ON c.id = p.category_id
       WHERE ${whereSql}
       ORDER BY ${order}
       LIMIT ${limitPh}::int OFFSET ${offsetPh}::int`,
      params,
    ),
    query<{ n: number }>(`${cte}SELECT COUNT(*)::int AS n FROM products p ${VX} WHERE ${whereSql}`, filterParams),
  ]);
  const total = count[0]?.n ?? 0;
  return { items: camelize(rows), total, page: f.page, limit, pages: pages(total, limit) };
}

export async function getPublicProduct(slugParam: string) {
  const slug = decodeParam(slugParam);
  const rows = await query(
    `SELECT p.id, p.name, p.slug, p.description, p.brand, p.sku, p.price, p.compare_at_price, p.is_featured,
            COALESCE(NOT p.track_stock OR ${EFF_STOCK} > 0, false)             AS in_stock,
            COALESCE(p.track_stock AND ${EFF_STOCK} BETWEEN 1 AND 5, false)    AS low_stock,
            (CASE WHEN p.track_stock THEN LEAST(p.stock, 20) ELSE 20 END)      AS max_qty,
            p.category_id, c.name AS category_name, c.slug AS category_slug, p.created_at, p.updated_at,
            COALESCE((SELECT json_agg(json_build_object('publicId', pi.public_id, 'alt', pi.alt) ORDER BY pi.sort_order, pi.created_at)
                      FROM product_images pi WHERE pi.product_id = p.id), '[]'::json) AS images
     FROM products p ${VX} LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.slug = $1::text AND p.is_active = true`,
    [slug],
  );
  if (!rows[0]) throw notFound('المنتج غير موجود');
  const product = camelize<Record<string, unknown> & { id: string; categoryId: string | null }>(rows[0]);
  const [variants, related] = await Promise.all([
    query(
      `SELECT v.id, v.size, v.color, v.color_hex, v.price, v.image_public_id,
              COALESCE(NOT p.track_stock OR v.stock > 0, false)              AS in_stock,
              COALESCE(p.track_stock AND v.stock BETWEEN 1 AND 5, false)     AS low_stock,
              (CASE WHEN p.track_stock THEN LEAST(v.stock, 20) ELSE 20 END)  AS max_qty
       FROM product_variants v JOIN products p ON p.id = v.product_id
       WHERE v.product_id = $1::uuid AND v.is_active = true
       ORDER BY v.sort_order, v.created_at`,
      [product.id],
    ),
    product.categoryId
      ? query(
          `SELECT ${CARD_COLUMNS} FROM products p ${VX} LEFT JOIN categories c ON c.id = p.category_id
           WHERE p.is_active = true AND p.category_id = $1::uuid AND p.id <> $2::uuid
           ORDER BY p.sold_count DESC, p.created_at DESC LIMIT 8`,
          [product.categoryId, product.id],
        )
      : Promise.resolve([]),
  ]);
  return { product: { ...product, variants: camelize(variants) }, related: camelize(related) };
}

export async function listSlugsForSitemap() {
  const [products, categories] = await Promise.all([
    query<{ slug: string; updated_at: string }>(`SELECT slug, updated_at FROM products WHERE is_active = true ORDER BY updated_at DESC LIMIT 5000`),
    query<{ slug: string; updated_at: string }>(`SELECT slug, updated_at FROM categories WHERE is_active = true`),
  ]);
  return { products: camelize(products), categories: camelize(categories) };
}

/* ------------------------------------------------------------------ admin */

export interface AdminProductFilter {
  q?: string;
  categoryId?: string;
  status: 'all' | 'active' | 'hidden' | 'out_of_stock';
  page: number;
  limit: number;
}

export async function listAdminProducts(f: AdminProductFilter) {
  const params: unknown[] = [];
  const where: string[] = ['TRUE'];
  if (f.q?.trim()) {
    const ph = param(params, `%${escapeLike(f.q.trim())}%`);
    where.push(`(p.name ILIKE ${ph}::text OR p.sku ILIKE ${ph}::text OR p.brand ILIKE ${ph}::text)`);
  }
  if (f.categoryId) where.push(`p.category_id = ${param(params, f.categoryId)}::uuid`);
  if (f.status === 'active') where.push('p.is_active = true');
  if (f.status === 'hidden') where.push('p.is_active = false');
  if (f.status === 'out_of_stock') where.push(`(p.track_stock = true AND ${EFF_STOCK} = 0)`);
  const whereSql = where.join(' AND ');
  const { limit, offset } = paging(f.page, f.limit);
  const filterParams = [...params];
  const limitPh = param(params, limit);
  const offsetPh = param(params, offset);

  const [rows, count] = await Promise.all([
    query(
      `SELECT p.id, p.name, p.slug, p.sku, ${EFF_PRICE} AS price, p.compare_at_price, ${EFF_STOCK} AS stock, vx.n AS variants_count,
              p.track_stock, p.is_active, p.is_featured, p.sold_count, p.created_at, c.name AS category_name,
              (SELECT pi.public_id FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order, pi.created_at LIMIT 1) AS image
       FROM products p ${VX} LEFT JOIN categories c ON c.id = p.category_id
       WHERE ${whereSql}
       ORDER BY p.created_at DESC, p.id
       LIMIT ${limitPh}::int OFFSET ${offsetPh}::int`,
      params,
    ),
    query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM products p ${VX} WHERE ${whereSql}`, filterParams),
  ]);
  const total = count[0]?.n ?? 0;
  return { items: camelize(rows), total, page: f.page, limit, pages: pages(total, limit) };
}

export async function getAdminProduct(id: string) {
  const rows = await query(
    `SELECT p.id, p.category_id, p.name, p.slug, p.sku, p.brand, p.description, p.price, p.compare_at_price, p.stock,
            p.track_stock, p.is_active, p.is_featured, p.sold_count, p.created_at, p.updated_at,
            COALESCE((SELECT json_agg(json_build_object('publicId', pi.public_id, 'alt', pi.alt) ORDER BY pi.sort_order, pi.created_at)
                      FROM product_images pi WHERE pi.product_id = p.id), '[]'::json) AS images
     FROM products p WHERE p.id = $1::uuid`,
    [id],
  );
  if (!rows[0]) throw notFound('المنتج غير موجود');
  const variants = await query(
    `SELECT id, size, color, color_hex, sku, price, stock, image_public_id, is_active
     FROM product_variants WHERE product_id = $1::uuid ORDER BY sort_order, created_at`,
    [id],
  );
  return camelize({ ...rows[0], variants });
}

async function replaceImages(t: Tx, productId: string, images: ProductInput['images']) {
  await t.query(`DELETE FROM product_images WHERE product_id = $1::uuid`, [productId]);
  if (images.length === 0) return;
  await t.query(
    `INSERT INTO product_images (product_id, public_id, alt, sort_order)
     SELECT $1::uuid, x.public_id, x.alt, x.ord
     FROM unnest($2::text[], $3::text[], $4::int[]) AS x(public_id, alt, ord)`,
    [productId, images.map((i) => i.publicId), images.map((i) => i.alt), images.map((_, i) => i)],
  );
}

/**
 * Saves the colour/size options while KEEPING the ids of existing ones (customers' carts and past orders point at them).
 * Rows are first parked under a temporary unique label so that swapping two labels never trips the unique index.
 */
async function syncVariants(t: Tx, productId: string, variants: VariantInput[]) {
  const existing = new Set((await t.query<{ id: string }>(`SELECT id FROM product_variants WHERE product_id = $1::uuid`, [productId])).map((r) => r.id));
  const keep = variants.filter((v): v is VariantInput & { id: string } => !!v.id && existing.has(v.id));
  const fresh = variants.filter((v) => !v.id || !existing.has(v.id));
  const order = new Map(variants.map((v, i) => [v, i]));
  const keepIds = keep.map((v) => v.id);

  await t.query(`DELETE FROM product_variants WHERE product_id = $1::uuid AND NOT (id = ANY($2::uuid[]))`, [productId, keepIds]);
  if (keep.length) {
    await t.query(`UPDATE product_variants SET size = '~' || id::text, color = '' WHERE id = ANY($1::uuid[])`, [keepIds]);
    await t.query(
      `UPDATE product_variants v SET size = x.size, color = x.color, color_hex = x.hex, sku = x.sku, price = x.price,
              stock = x.stock, image_public_id = x.img, sort_order = x.ord, is_active = x.active
       FROM unnest($1::uuid[], $2::text[], $3::text[], $4::text[], $5::text[], $6::int[], $7::int[], $8::text[], $9::int[], $10::boolean[])
            AS x(id, size, color, hex, sku, price, stock, img, ord, active)
       WHERE v.id = x.id AND v.product_id = $11::uuid`,
      [keepIds, keep.map((v) => v.size), keep.map((v) => v.color), keep.map((v) => v.colorHex), keep.map((v) => v.sku), keep.map((v) => v.price), keep.map((v) => v.stock), keep.map((v) => v.imagePublicId), keep.map((v) => order.get(v) ?? 0), keep.map((v) => v.isActive), productId],
    );
  }
  if (fresh.length) {
    await t.query(
      `INSERT INTO product_variants (product_id, size, color, color_hex, sku, price, stock, image_public_id, sort_order, is_active)
       SELECT $1::uuid, x.size, x.color, x.hex, x.sku, x.price, x.stock, x.img, x.ord, x.active
       FROM unnest($2::text[], $3::text[], $4::text[], $5::text[], $6::int[], $7::int[], $8::text[], $9::int[], $10::boolean[])
            AS x(size, color, hex, sku, price, stock, img, ord, active)`,
      [productId, fresh.map((v) => v.size), fresh.map((v) => v.color), fresh.map((v) => v.colorHex), fresh.map((v) => v.sku), fresh.map((v) => v.price), fresh.map((v) => v.stock), fresh.map((v) => v.imagePublicId), fresh.map((v) => order.get(v) ?? 0), fresh.map((v) => v.isActive)],
    );
  }
}

async function assertCategory(t: Tx, categoryId: string | null) {
  if (!categoryId) return;
  const rows = await t.query(`SELECT 1 FROM categories WHERE id = $1::uuid`, [categoryId]);
  if (!rows[0]) throw new ApiError(422, 'القسم المختار غير موجود', 'validation');
}

export async function createProduct(input: ProductInput): Promise<string> {
  return tx(async (t) => {
    await assertCategory(t, input.categoryId);
    const slug = await uniqueSlug('products', slugify(input.name, 'product'), null, t);
    const rows = await t.query<{ id: string }>(
      `INSERT INTO products (category_id, name, slug, sku, brand, description, price, compare_at_price, stock, track_stock, is_active, is_featured)
       VALUES ($1::uuid, $2::text, $3::text, $4::text, $5::text, $6::text, $7::int, $8::int, $9::int, $10::boolean, $11::boolean, $12::boolean)
       RETURNING id`,
      [input.categoryId, input.name, slug, input.sku, input.brand, input.description, input.price, input.compareAtPrice, input.stock, input.trackStock, input.isActive, input.isFeatured],
    );
    await replaceImages(t, rows[0].id, input.images);
    await syncVariants(t, rows[0].id, input.variants);
    return rows[0].id;
  });
}

export async function updateProduct(id: string, input: ProductInput): Promise<void> {
  const removed = await tx(async (t) => {
    const existing = await t.query<{ id: string }>(`SELECT id FROM products WHERE id = $1::uuid FOR UPDATE`, [id]);
    if (!existing[0]) throw notFound('المنتج غير موجود');
    await assertCategory(t, input.categoryId);
    const before = await t.query<{ public_id: string }>(`SELECT public_id FROM product_images WHERE product_id = $1::uuid`, [id]);
    // The slug is intentionally NOT regenerated: published URLs must stay stable for SEO and shared links.
    await t.query(
      `UPDATE products SET category_id = $2::uuid, name = $3::text, sku = $4::text, brand = $5::text, description = $6::text,
              price = $7::int, compare_at_price = $8::int, stock = $9::int, track_stock = $10::boolean,
              is_active = $11::boolean, is_featured = $12::boolean, updated_at = now()
       WHERE id = $1::uuid`,
      [id, input.categoryId, input.name, input.sku, input.brand, input.description, input.price, input.compareAtPrice, input.stock, input.trackStock, input.isActive, input.isFeatured],
    );
    await replaceImages(t, id, input.images);
    await syncVariants(t, id, input.variants);
    const keep = new Set(input.images.map((i) => i.publicId));
    return before.map((b) => b.public_id).filter((p) => !keep.has(p));
  });
  await deleteImages(removed);
}

export async function setProductFlags(id: string, flags: { isActive?: boolean; isFeatured?: boolean }): Promise<void> {
  const rows = await query(
    `UPDATE products SET is_active = COALESCE($2::boolean, is_active), is_featured = COALESCE($3::boolean, is_featured), updated_at = now()
     WHERE id = $1::uuid RETURNING id`,
    [id, flags.isActive ?? null, flags.isFeatured ?? null],
  );
  if (!rows[0]) throw notFound('المنتج غير موجود');
}

export async function deleteProduct(id: string): Promise<void> {
  const images = await query<{ public_id: string }>(`SELECT public_id FROM product_images WHERE product_id = $1::uuid`, [id]);
  const rows = await query(`DELETE FROM products WHERE id = $1::uuid RETURNING id`, [id]);
  if (!rows[0]) throw notFound('المنتج غير موجود');
  await deleteImages(images.map((i) => i.public_id));
}
