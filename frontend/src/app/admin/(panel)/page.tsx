'use client';

import Link from 'next/link';
import { dayLabel, formatDate, formatNumber, STATUS_LABEL } from '@/lib/format';
import { cld } from '@/lib/image';
import { ErrorBox, PageLoading, StatusPill, useApi } from '@/components/admin/ui';

interface Stats {
  totals: { newOrders: number; ordersToday: number; deliveredRevenue: number; pendingRevenue: number; revenue30d: number; orders30d: number };
  daily: { day: string; orders: number; revenue: number }[];
  topProducts: { productName: string; quantity: number; revenue: number }[];
  statusCounts: Record<string, number>;
  lowStock: { id: string; name: string; stock: number; image: string | null }[];
  recent: { id: string; orderNumber: string; status: string; customerName: string; wilayaName: string; total: number; createdAt: string }[];
  catalog: { activeProducts: number; hiddenProducts: number; categories: number };
}

function Chart({ data }: { data: Stats['daily'] }) {
  const max = Math.max(1, ...data.map((d) => d.orders));
  const w = 700, h = 170, pad = 22, bw = (w - pad * 2) / data.length;
  return (
    <svg className="chart" viewBox={`0 0 ${w} ${h + 26}`} role="img" aria-label="عدد الطلبات خلال آخر 14 يومًا" preserveAspectRatio="none">
      {[0.25, 0.5, 0.75, 1].map((t) => <line key={t} x1={pad} x2={w - pad} y1={h - h * t * 0.92} y2={h - h * t * 0.92} stroke="#e2e7ef" strokeDasharray="3 5" />)}
      {data.map((d, i) => {
        const bh = (d.orders / max) * h * 0.92;
        const x = pad + i * bw + bw * 0.18;
        return (
          <g key={d.day}>
            <title>{`${dayLabel(d.day)}: ${d.orders} طلب — ${formatNumber(d.revenue)} دج`}</title>
            <rect x={x} y={h - bh} width={bw * 0.64} height={Math.max(bh, d.orders ? 3 : 1.5)} rx={5} fill={d.orders ? '#1f4fd8' : '#dfe5ef'} />
            {d.orders > 0 && <text x={x + bw * 0.32} y={h - bh - 5} textAnchor="middle" fontSize="12" fontWeight="700" fill="#12307f">{d.orders}</text>}
            {i % 2 === 0 && <text x={x + bw * 0.32} y={h + 18} textAnchor="middle" fontSize="11" fill="#667289">{dayLabel(d.day)}</text>}
          </g>
        );
      })}
    </svg>
  );
}

export default function DashboardPage() {
  const { data, error, loading, reload } = useApi<Stats>('/admin/stats');
  if (loading && !data) return <PageLoading />;
  if (error || !data) return <ErrorBox message={error || 'تعذّر تحميل الإحصائيات'} onRetry={reload} />;
  const { totals: t } = data;
  const topMax = Math.max(1, ...data.topProducts.map((p) => p.quantity));
  return (
    <>
      <div className="stats">
        <div className="card-a stat"><small>طلبات جديدة</small><strong className="num">{t.newOrders}</strong></div>
        <div className="card-a stat brass"><small>طلبات اليوم</small><strong className="num">{t.ordersToday}</strong></div>
        <div className="card-a stat ok"><small>مبيعات مُسلَّمة</small><strong><span className="num">{formatNumber(t.deliveredRevenue)}</span> <small>دج</small></strong></div>
        <div className="card-a stat warn"><small>قيد التنفيذ</small><strong><span className="num">{formatNumber(t.pendingRevenue)}</span> <small>دج</small></strong></div>
      </div>

      <div className="two-col">
        <section className="card-a">
          <div className="card-head"><h2>الطلبات في آخر 14 يومًا</h2><span className="muted"><span className="num">{t.orders30d}</span> طلب • <span className="num">{formatNumber(t.revenue30d)}</span> دج (30 يومًا)</span></div>
          <Chart data={data.daily} />
        </section>
        <section className="card-a">
          <div className="card-head"><h2>حالة الطلبات</h2></div>
          <div className="stack" style={{ ['--gap' as string]: '.7rem' }}>
            {Object.keys(STATUS_LABEL).map((s) => (
              <div key={s} className="row" style={{ justifyContent: 'space-between' }}><StatusPill status={s} /><b className="num">{data.statusCounts[s] ?? 0}</b></div>
            ))}
          </div>
        </section>
      </div>

      <div className="two-col">
        <section className="card-a">
          <div className="card-head"><h2>آخر الطلبات</h2><Link href="/admin/orders" className="link-more">عرض الكل ←</Link></div>
          {data.recent.length === 0 ? <p className="muted">لا توجد طلبات بعد. ستظهر هنا فور وصولها.</p> : (
            <div className="table-wrap"><table className="t"><thead><tr><th>الطلب</th><th>الزبون</th><th>الولاية</th><th>الإجمالي</th><th>الحالة</th></tr></thead>
              <tbody>{data.recent.map((o) => (
                <tr key={o.id}><td><Link href={`/admin/orders/${o.id}`} className="num" style={{ color: 'var(--cobalt)', fontWeight: 700 }}>{o.orderNumber}</Link><br /><small className="muted">{formatDate(o.createdAt)}</small></td><td>{o.customerName}</td><td>{o.wilayaName}</td><td><span className="num">{formatNumber(o.total)}</span> دج</td><td><StatusPill status={o.status} /></td></tr>
              ))}</tbody></table></div>
          )}
        </section>
        <div style={{ display: 'grid', gap: '1.2rem', alignContent: 'start' }}>
          <section className="card-a">
            <div className="card-head"><h2>الأكثر مبيعًا (30 يومًا)</h2></div>
            {data.topProducts.length === 0 ? <p className="muted">لا توجد مبيعات بعد.</p> : (
              <div className="stack" style={{ ['--gap' as string]: '.8rem' }}>
                {data.topProducts.map((p) => (
                  <div className="bar-row" key={p.productName}><span>{p.productName}</span><b className="num">{p.quantity}</b><div className="bar"><i style={{ width: `${(p.quantity / topMax) * 100}%` }} /></div></div>
                ))}
              </div>
            )}
          </section>
          <section className="card-a">
            <div className="card-head"><h2>مخزون منخفض</h2><span className="muted"><span className="num">{data.catalog.activeProducts}</span> منتج نشط</span></div>
            {data.lowStock.length === 0 ? <p className="muted">كل المنتجات متوفرة بكميات جيدة ✓</p> : (
              <div className="stack" style={{ ['--gap' as string]: '.6rem' }}>
                {data.lowStock.map((p) => (
                  <Link key={p.id} href={`/admin/products/${p.id}`} className="row">
                    <div className="thumb-s">{p.image && <img src={cld(p.image, { width: 46, ratio: '1:1' })} alt="" width={46} height={46} />}</div>
                    <span className="grow">{p.name}</span>
                    <span className={`pill ${p.stock === 0 ? 'pill-bad' : 'pill-warn'}`}>{p.stock === 0 ? 'نفد' : `${p.stock} متبقي`}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
