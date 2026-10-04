'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { formatDate, formatNumber, STATUS_LABEL, STATUS_ORDER } from '@/lib/format';
import { ErrorBox, PageLoading, Pagination, StatusPill, useApi, useDebounced } from '@/components/admin/ui';

interface Order { id: string; orderNumber: string; status: string; customerName: string; phone: string; wilayaName: string; total: number; shippingPending: boolean; createdAt: string; itemsCount: number }
interface Res { items: Order[]; total: number; page: number; pages: number; counts: Record<string, number> }

export default function OrdersPage() {
  const router = useRouter();
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const qs = new URLSearchParams({ status, page: String(page), limit: '20' });
  if (dq.trim()) qs.set('q', dq.trim());
  const { data, error, loading, reload } = useApi<Res>(`/admin/orders?${qs}`);
  const total = data ? Object.values(data.counts).reduce((a, b) => a + b, 0) : 0;
  return (
    <div className="card-a">
      <div className="card-head">
        <div className="tabs" role="group" aria-label="تصفية الحالة">
          <button className="tab" aria-pressed={status === 'all'} onClick={() => { setStatus('all'); setPage(1); }}>الكل<span className="n">{total}</span></button>
          {STATUS_ORDER.map((s) => <button key={s} className="tab" aria-pressed={status === s} onClick={() => { setStatus(s); setPage(1); }}>{STATUS_LABEL[s]}<span className="n">{data?.counts[s] ?? 0}</span></button>)}
        </div>
        <input className="input search-a" placeholder="بحث: رقم الطلب، الاسم، الهاتف، الولاية" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="بحث" />
      </div>
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data ? <PageLoading /> : data && (
        data.items.length === 0 ? <p className="muted center" style={{ padding: '2rem' }}>لا توجد طلبات مطابقة.</p> : (
          <div className="table-wrap"><table className="t"><thead><tr><th>الطلب</th><th>الزبون</th><th>الهاتف</th><th>الولاية</th><th>القطع</th><th>الإجمالي</th><th>الحالة</th></tr></thead>
            <tbody>{data.items.map((o) => (
              <tr key={o.id} className="click" tabIndex={0} onClick={() => router.push(`/admin/orders/${o.id}`)} onKeyDown={(e) => e.key === 'Enter' && router.push(`/admin/orders/${o.id}`)}>
                <td><b className="num" style={{ color: 'var(--cobalt)' }}>{o.orderNumber}</b><br /><small className="muted">{formatDate(o.createdAt)}</small></td>
                <td>{o.customerName}</td><td className="num">{o.phone}</td><td>{o.wilayaName}</td><td className="num">{o.itemsCount}</td>
                <td><span className="num">{formatNumber(o.total)}</span> دج{o.shippingPending && <small className="muted"><br />+ توصيل</small>}</td>
                <td><StatusPill status={o.status} /></td>
              </tr>
            ))}</tbody></table></div>
        )
      )}
      {data && <Pagination page={data.page} pages={data.pages} onPage={setPage} />}
    </div>
  );
}
