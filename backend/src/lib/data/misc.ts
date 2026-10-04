import { query } from '../db';
import { camelize } from '../camel';
import { notFound } from '../http';
import { deleteImages } from '../cloudinary';
import type { BannerInput } from '../validators';

/* ---------------------------------------------------------------- settings */
export async function getSettings(): Promise<Record<string, string>> {
  const rows = await query<{ key: string; value: string }>(`SELECT key, value FROM settings`);
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function updateSettings(values: Record<string, string>): Promise<void> {
  const keys = Object.keys(values);
  if (keys.length === 0) return;
  await query(
    `INSERT INTO settings (key, value, updated_at)
     SELECT x.key, x.value, now() FROM unnest($1::text[], $2::text[]) AS x(key, value)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [keys, keys.map((k) => values[k])],
  );
}

/* ----------------------------------------------------------------- banners */
export async function listPublicBanners() {
  return camelize(
    await query(
      `SELECT id, title, subtitle, button_text, link_url, image_public_id FROM banners WHERE is_active = true ORDER BY sort_order, created_at`,
    ),
  );
}
export async function listAdminBanners() {
  return camelize(await query(`SELECT id, title, subtitle, button_text, link_url, image_public_id, sort_order, is_active FROM banners ORDER BY sort_order, created_at`));
}
export async function createBanner(b: BannerInput): Promise<string> {
  const rows = await query<{ id: string }>(
    `INSERT INTO banners (title, subtitle, button_text, link_url, image_public_id, sort_order, is_active)
     VALUES ($1::text, $2::text, $3::text, $4::text, $5::text, $6::int, $7::boolean) RETURNING id`,
    [b.title, b.subtitle, b.buttonText, b.linkUrl, b.imagePublicId, b.sortOrder, b.isActive],
  );
  return rows[0].id;
}
export async function updateBanner(id: string, b: BannerInput): Promise<void> {
  const before = (await query<{ image_public_id: string | null }>(`SELECT image_public_id FROM banners WHERE id = $1::uuid`, [id]))[0];
  if (!before) throw notFound('البانر غير موجود');
  await query(
    `UPDATE banners SET title = $2::text, subtitle = $3::text, button_text = $4::text, link_url = $5::text,
            image_public_id = $6::text, sort_order = $7::int, is_active = $8::boolean, updated_at = now()
     WHERE id = $1::uuid`,
    [id, b.title, b.subtitle, b.buttonText, b.linkUrl, b.imagePublicId, b.sortOrder, b.isActive],
  );
  if (before.image_public_id && before.image_public_id !== b.imagePublicId) await deleteImages([before.image_public_id]);
}
export async function deleteBanner(id: string): Promise<void> {
  const rows = await query<{ image_public_id: string | null }>(`DELETE FROM banners WHERE id = $1::uuid RETURNING image_public_id`, [id]);
  if (!rows[0]) throw notFound('البانر غير موجود');
  await deleteImages([rows[0].image_public_id]);
}

/* ---------------------------------------------------------------- shipping */
export async function listShipping(onlyActive: boolean) {
  const rows = await query(
    `SELECT wilaya_code, wilaya_name, price, is_active FROM shipping_rates
     WHERE ($1::boolean = false OR is_active = true) ORDER BY wilaya_code`,
    [onlyActive],
  );
  return camelize(rows);
}
export async function updateShipping(rates: { wilayaCode: number; price: number | null; isActive: boolean }[]): Promise<void> {
  await query(
    `UPDATE shipping_rates s SET price = x.price, is_active = x.is_active, updated_at = now()
     FROM unnest($1::int[], $2::int[], $3::boolean[]) AS x(code, price, is_active)
     WHERE s.wilaya_code = x.code`,
    [rates.map((r) => r.wilayaCode), rates.map((r) => r.price), rates.map((r) => r.isActive)],
  );
}

/* ----------------------------------------------------------- notifications */
export async function notificationSummary() {
  const [counts, latest] = await Promise.all([
    query<{ unread: number }>(`SELECT COUNT(*) FILTER (WHERE is_read = false)::int AS unread FROM notifications`),
    query(`SELECT id, type, title, body, link, is_read, created_at FROM notifications ORDER BY created_at DESC LIMIT 8`),
  ]);
  return { unread: counts[0]?.unread ?? 0, latest: camelize(latest) };
}
export async function listNotifications(limit: number, offset: number) {
  const [rows, total] = await Promise.all([
    query(`SELECT id, type, title, body, link, is_read, created_at FROM notifications ORDER BY created_at DESC, id LIMIT $1::int OFFSET $2::int`, [limit, offset]),
    query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM notifications`),
  ]);
  return { items: camelize(rows), total: total[0]?.n ?? 0 };
}
export async function markNotificationsRead(id: string | null): Promise<void> {
  await query(`UPDATE notifications SET is_read = true WHERE is_read = false AND ($1::uuid IS NULL OR id = $1::uuid)`, [id]);
}

