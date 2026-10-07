'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/client-api';
import { formatDate, formatNumber, STATUS_LABEL } from '@/lib/format';
import { cld } from '@/lib/image';
import { telLink, whatsappLink } from '@/lib/site';
import { toast } from '@/lib/toast';
import { BoxIcon, PhoneIcon, WhatsappIcon } from '@/components/icons';
import { ErrorBox, PageLoading, StatusPill, useApi } from '@/components/admin/ui';

interface Order {
  id: string; orderNumber: string; status: string; customerName: string; phone: string; wilayaCode: number; wilayaName: string; commune: string; address: string;
  customerNote: string; adminNote: string; subtotal: number; shippingFee: number; shippingPending: boolean; total: number; createdAt: string;
  items: { id: string; productName: string; variantLabel: string; imagePublicId: string | null; unitPrice: number; quantity: number; lineTotal: number }[];
  history: { id: string; status: string; note: string; createdAt: string; adminName: string | null }[];
}

const NEXT: Record<string, string[]> = {
  new: ['confirmed', 'shipped', 'delivered', 'cancelled'],
  confirmed: ['shipped', 'delivered', 'cancelled'],
  shipped: ['delivered', 'returned', 'cancelled'],
  delivered: ['returned'],
  cancelled: [],
  returned: [],
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, setData, error, loading, reload } = useApi<Order>(`/admin/orders/${id}`);
  const [note, setNote] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [fee, setFee] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (data) { setAdminNote(data.adminNote); setFee(String(data.shippingFee)); } }, [data]);
  if (loading && !data) return <PageLoading />;
  if (error || !data) return <ErrorBox message={error || 'الطلب غير موجود'} onRetry={reload} />;
  const o = data;

  async function patch(body: Record<string, unknown>, okMsg: string) {
    setBusy(true);
    try {
      setData(await api<Order>(`/admin/orders/${id}`, { method: 'PATCH', body }));
      setNote('');
      toast(okMsg);
    } catch (e) {
      toast(errorMessage(e), 'bad');
    } finally {
      setBusy(false);
    }
  }
  const final = o.status === 'cancelled' || o.status === 'returned';
  const msg = `السلام عليكم ${o.customerName}، بخصوص طلبكم رقم ${o.orderNumber} من Gamil Minage`;

  return (
    <>
      <div className="row wrap no-print">
        <Link href="/admin/orders" className="btn btn-sm btn-ghost">→ كل الطلبات</Link>
        <span className="grow" />
        <a className="btn btn-sm btn-soft" href={telLink(o.phone)}><PhoneIcon width={16} height={16} /> اتصال</a>
        <a className="btn btn-sm btn-whatsapp" target="_blank" rel="noopener noreferrer" href={whatsappLink(o.phone, msg)}><WhatsappIcon width={16} height={16} /> واتساب</a>
        <button className="btn btn-sm btn-ghost" onClick={() => window.print()}>طباعة</button>
      </div>

      <div className="two-col">
        <div style={{ display: 'grid', gap: '1.2rem', alignContent: 'start' }}>
          <section className="card-a">
            <div className="card-head"><h2>الطلب <span className="num">{o.orderNumber}</span></h2><StatusPill status={o.status} /></div>
            <div className="table-wrap"><table className="t"><thead><tr><th>المنتج</th><th>السعر</th><th>الكمية</th><th>المجموع</th></tr></thead><tbody>
              {o.items.map((i) => (
                <tr key={i.id}>
                  <td><div className="row"><div className="thumb-s">{i.imagePublicId ? <img src={cld(i.imagePublicId, { width: 46, ratio: '1:1' })} alt="" width={46} height={46} /> : <div className="noimg"><BoxIcon /></div>}</div><div>{i.productName}{i.variantLabel && <><br /><small className="muted">{i.variantLabel}</small></>}</div></div></td>
                  <td className="num">{formatNumber(i.unitPrice)}</td><td className="num">{i.quantity}</td><td className="num">{formatNumber(i.lineTotal)}</td>
                </tr>
              ))}</tbody></table></div>
            <div style={{ maxWidth: 340, marginInlineStart: 'auto', marginBlockStart: '.8rem' }}>
              <div className="summary-row"><span>المجموع</span><span><span className="num">{formatNumber(o.subtotal)}</span> دج</span></div>
              <div className="summary-row"><span>التوصيل {o.shippingPending && <span className="pill pill-warn">لم يُحدَّد</span>}</span><span><span className="num">{formatNumber(o.shippingFee)}</span> دج</span></div>
              <div className="summary-row total"><span>المطلوب عند الاستلام</span><span><span className="num">{formatNumber(o.total)}</span> دج</span></div>
            </div>
            {!final && (
              <div className="row wrap no-print" style={{ marginBlockStart: '1rem' }}>
                <label htmlFor="fee" className="muted">سعر التوصيل (دج)</label>
                <input id="fee" className="input" style={{ width: 130 }} type="number" min={0} inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value)} />
                <button className="btn btn-sm btn-soft" disabled={busy || fee === '' || Number(fee) === o.shippingFee && !o.shippingPending} onClick={() => void patch({ shippingFee: Number(fee) }, 'تم تحديث سعر التوصيل')}>حفظ</button>
              </div>
            )}
          </section>

          <section className="card-a no-print">
            <div className="card-head"><h2>تغيير الحالة</h2></div>
            {NEXT[o.status].length === 0 ? <p className="muted">هذه الحالة نهائية ولا يمكن تغييرها.</p> : (
              <>
                <input className="input" placeholder="ملاحظة للسجل (اختياري)" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} aria-label="ملاحظة" />
                <div className="row wrap" style={{ marginBlockStart: '.8rem' }}>
                  {NEXT[o.status].map((s) => (
                    <button key={s} className={`btn btn-sm ${s === 'cancelled' || s === 'returned' ? 'btn-ghost' : ''}`} disabled={busy}
                      onClick={() => { if ((s === 'cancelled' || s === 'returned') && !window.confirm(`تأكيد: ${STATUS_LABEL[s]}؟ ستعود الكميات إلى المخزون ولا يمكن التراجع.`)) return; void patch({ status: s, note }, `تم تغيير الحالة إلى «${STATUS_LABEL[s]}»`); }}>
                      {STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>

        <div style={{ display: 'grid', gap: '1.2rem', alignContent: 'start' }}>
          <section className="card-a">
            <div className="card-head"><h2>بيانات الزبون</h2></div>
            <dl className="kv">
              <dt>الاسم</dt><dd>{o.customerName}</dd>
              <dt>الهاتف</dt><dd className="num">{o.phone}</dd>
              <dt>الولاية</dt><dd><span className="num">{String(o.wilayaCode).padStart(2, '0')}</span> - {o.wilayaName}</dd>
              <dt>البلدية</dt><dd>{o.commune}</dd>
              {o.address && <><dt>العنوان</dt><dd>{o.address}</dd></>}
              {o.customerNote && <><dt>ملاحظة الزبون</dt><dd>{o.customerNote}</dd></>}
              <dt>تاريخ الطلب</dt><dd>{formatDate(o.createdAt)}</dd>
            </dl>
          </section>
          <section className="card-a no-print">
            <div className="card-head"><h2>ملاحظة داخلية</h2></div>
            <textarea className="textarea" maxLength={1000} value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="لا تظهر للزبون" aria-label="ملاحظة داخلية" />
            <button className="btn btn-sm btn-soft" style={{ marginBlockStart: '.6rem' }} disabled={busy || adminNote === o.adminNote} onClick={() => void patch({ adminNote }, 'تم حفظ الملاحظة')}>حفظ</button>
          </section>
          <section className="card-a">
            <div className="card-head"><h2>سجل الحالات</h2></div>
            <ul className="timeline">
              {o.history.map((h) => (
                <li key={h.id}><StatusPill status={h.status} /> <small className="muted">{formatDate(h.createdAt)}{h.adminName ? ` • ${h.adminName}` : ''}</small>{h.note && <div style={{ fontSize: '.88rem' }}>{h.note}</div>}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
