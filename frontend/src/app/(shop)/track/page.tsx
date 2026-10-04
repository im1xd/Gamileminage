'use client';

import { useState, type FormEvent } from 'react';
import { api, errorMessage } from '@/lib/client-api';
import { STATUS_LABEL, STATUS_TONE, formatDate, formatNumber } from '@/lib/format';

interface Tracked {
  orderNumber: string; status: string; subtotal: number; shippingFee: number; shippingPending: boolean; total: number; wilayaName: string; createdAt: string;
  items: { productName: string; quantity: number; unitPrice: number }[];
  history: { status: string; createdAt: string }[];
}

export default function TrackPage() {
  const [number, setNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<Tracked | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(''); setOrder(null);
    try {
      setOrder(await api<Tracked>('/public/orders/track', { method: 'POST', body: { number: number.trim(), phone } }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <div className="page-title"><h1>تتبّع طلبك</h1><p className="muted">أدخل رقم الطلب ورقم الهاتف الذي طلبت به.</p></div>
      <form className="panel form-grid" onSubmit={submit} style={{ marginBlockEnd: '1.2rem' }}>
        <div className="field"><label htmlFor="n">رقم الطلب</label><input id="n" className="input" dir="ltr" placeholder="GM-1001" value={number} onChange={(e) => setNumber(e.target.value)} maxLength={20} required /></div>
        <div className="field"><label htmlFor="p">رقم الهاتف</label><input id="p" className="input" dir="ltr" type="tel" placeholder="07XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} required /></div>
        <div className="field full"><button className="btn" disabled={busy} type="submit">{busy ? <span className="spinner" /> : 'بحث'}</button></div>
      </form>
      {error && <div className="notice bad" role="alert">{error}</div>}
      {order && (
        <div className="panel" style={{ marginBlockEnd: '3rem' }}>
          <div className="row wrap" style={{ justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0 }} className="num">{order.orderNumber}</h2>
            <span className={`pill pill-${STATUS_TONE[order.status] ?? 'info'}`} style={{ padding: '.2rem .9rem', borderRadius: 999, background: 'var(--cobalt-tint)', fontWeight: 700 }}>{STATUS_LABEL[order.status] ?? order.status}</span>
          </div>
          <p className="muted" style={{ marginBlock: '.4rem 1rem' }}>{order.wilayaName} • {formatDate(order.createdAt)}</p>
          {order.items.map((i, idx) => (
            <div className="summary-row" key={idx}><span>{i.productName} <span className="muted">× <span className="num">{i.quantity}</span></span></span><span className="num">{formatNumber(i.unitPrice * i.quantity)}</span></div>
          ))}
          <div className="summary-row"><span>التوصيل</span><span>{order.shippingPending ? 'سيُؤكَّد' : <><span className="num">{formatNumber(order.shippingFee)}</span> دج</>}</span></div>
          <div className="summary-row total"><span>الإجمالي</span><span><span className="num">{formatNumber(order.total)}</span> دج</span></div>
          <h3 style={{ marginBlock: '1.2rem .6rem', fontSize: '1rem' }}>مراحل الطلب</h3>
          <ol style={{ margin: 0, paddingInlineStart: '1.2rem', display: 'grid', gap: '.4rem' }}>
            {order.history.map((h, i) => <li key={i}><b>{STATUS_LABEL[h.status] ?? h.status}</b> <span className="muted">— {formatDate(h.createdAt)}</span></li>)}
          </ol>
        </div>
      )}
    </div>
  );
}
