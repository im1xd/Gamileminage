import { query } from '../db';
import { camelize } from '../camel';

const TZ = `'Africa/Algiers'`;

export async function dashboardStats() {
  const [totals, daily, topProducts, byStatus, lowStock, recent, catalog] = await Promise.all([
    query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'new')::int                                                           AS new_orders,
         COUNT(*) FILTER (WHERE (created_at AT TIME ZONE ${TZ})::date = (now() AT TIME ZONE ${TZ})::date)::int AS orders_today,
         COALESCE(SUM(total) FILTER (WHERE status = 'delivered'), 0)::int                                      AS delivered_revenue,
         COALESCE(SUM(total) FILTER (WHERE status IN ('new','confirmed','shipped')), 0)::int                   AS pending_revenue,
         COALESCE(SUM(total) FILTER (WHERE status <> 'cancelled' AND status <> 'returned'
                                       AND created_at >= now() - interval '30 days'), 0)::int                  AS revenue_30d,
         COUNT(*) FILTER (WHERE created_at >= now() - interval '30 days')::int                                 AS orders_30d
       FROM orders`,
    ),
    query(
      `SELECT d::date AS day, COALESCE(o.orders, 0)::int AS orders, COALESCE(o.revenue, 0)::int AS revenue
       FROM generate_series(((now() AT TIME ZONE ${TZ})::date - 13)::timestamp, (now() AT TIME ZONE ${TZ})::date::timestamp, interval '1 day') AS d
       LEFT JOIN (
         SELECT (created_at AT TIME ZONE ${TZ})::date AS day, COUNT(*) AS orders,
                SUM(total) FILTER (WHERE status <> 'cancelled' AND status <> 'returned') AS revenue
         FROM orders WHERE created_at >= now() - interval '16 days'
         GROUP BY (created_at AT TIME ZONE ${TZ})::date
       ) o ON o.day = d::date
       ORDER BY d`,
    ),
    query(
      `SELECT oi.product_name, SUM(oi.quantity)::int AS quantity, SUM(oi.line_total)::int AS revenue
       FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE o.status <> 'cancelled' AND o.status <> 'returned' AND o.created_at >= now() - interval '30 days'
       GROUP BY oi.product_name ORDER BY quantity DESC, oi.product_name LIMIT 5`,
    ),
    query(`SELECT status, COUNT(*)::int AS n FROM orders GROUP BY status`),
    query(
      `SELECT * FROM (
         SELECT p.id, p.name, p.stock,
                (SELECT pi.public_id FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order, pi.created_at LIMIT 1) AS image
         FROM products p
         WHERE p.is_active = true AND p.track_stock = true AND p.stock <= 5
           AND NOT EXISTS (SELECT 1 FROM product_variants x WHERE x.product_id = p.id AND x.is_active = true)
         UNION ALL
         SELECT p.id, p.name || ' — ' || concat_ws(' / ', NULLIF(v.color, ''), NULLIF(v.size, '')) AS name, v.stock,
                COALESCE(v.image_public_id, (SELECT pi.public_id FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order, pi.created_at LIMIT 1)) AS image
         FROM product_variants v JOIN products p ON p.id = v.product_id
         WHERE p.is_active = true AND p.track_stock = true AND v.is_active = true AND v.stock <= 5
       ) low
       ORDER BY stock, name LIMIT 8`,
    ),
    query(
      `SELECT id, order_number, status, customer_name, wilaya_name, total, created_at
       FROM orders ORDER BY created_at DESC LIMIT 6`,
    ),
    query(
      `SELECT (SELECT COUNT(*) FROM products WHERE is_active = true)::int  AS active_products,
              (SELECT COUNT(*) FROM products WHERE is_active = false)::int AS hidden_products,
              (SELECT COUNT(*) FROM categories)::int                        AS categories`,
    ),
  ]);
  const statusCounts: Record<string, number> = {};
  for (const r of byStatus as { status: string; n: number }[]) statusCounts[r.status] = r.n;
  return camelize({ totals: totals[0], daily, topProducts, statusCounts, lowStock, recent, catalog: catalog[0] });
}
