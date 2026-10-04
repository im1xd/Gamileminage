'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type FormEvent, type InputHTMLAttributes } from 'react';
import { useCart } from '@/lib/cart';
import { api, errorMessage, ApiClientError } from '@/lib/client-api';
import { formatNumber } from '@/lib/format';
import { toast } from '@/lib/toast';
import type { OrderResult, ShippingRate } from '@/lib/types';
import { Img } from '@/components/Img';
import { BoxIcon } from '@/components/icons';

const PHONE_RE = /^(?:\+213|00213|0)?[567]\d{8}$/;

interface Form { customerName: string; phone: string; wilayaCode: string; commune: string; address: string; note: string; website: string }
const EMPTY: Form = { customerName: '', phone: '', wilayaCode: '', commune: '', address: '', note: '', website: '' };

export default function CheckoutPage() {
  const cart = useCart();
  const router = useRouter();
  const [rates, setRates] = useState<ShippingRate[] | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    api<ShippingRate[]>('/public/shipping').then(setRates).catch(() => setRates([]));
  }, []);

  const rate = useMemo(() => rates?.find((r) => String(r.wilayaCode) === form.wilayaCode), [rates, form.wilayaCode]);
  const shipping = rate?.price ?? 0;
  const total = cart.subtotal + shipping;
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function validate(): boolean {
    const next: Partial<Record<keyof Form, string>> = {};
    if (form.customerName.trim().length < 3) next.customerName = 'اكتب اسمك الكامل';
    if (!PHONE_RE.test(form.phone.replace(/[\s.\-()]/g, ''))) next.phone = 'رقم هاتف غير صالح (مثال: 0793811891)';
    if (!form.wilayaCode) next.wilayaCode = 'اختر الولاية';
    if (form.commune.trim().length < 2) next.commune = 'اكتب اسم البلدية';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setServerError('');
    if (!validate() || busy) return;
    setBusy(true);
    try {
      const result = await api<OrderResult>('/public/orders', {
        method: 'POST',
        body: {
          customerName: form.customerName,
          phone: form.phone,
          wilayaCode: Number(form.wilayaCode),
          commune: form.commune,
          address: form.address,
          note: form.note,
          website: form.website,
          items: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        },
      });
      cart.clear();
      const qs = new URLSearchParams({ n: result.orderNumber, t: String(result.total), p: result.shippingPending ? '1' : '0' });
      router.replace(`/order/success?${qs.toString()}`);
    } catch (error) {
      const msg = errorMessage(error);
      setServerError(msg);
      toast(msg, 'bad');
      if (error instanceof ApiClientError && error.status === 422 && error.details && typeof error.details === 'object') {
        const fe = error.details as Record<string, string[]>;
        setErrors({ customerName: fe.customerName?.[0], phone: fe.phone?.[0], commune: fe.commune?.[0], wilayaCode: fe.wilayaCode?.[0] });
      }
    } finally {
      setBusy(false);
    }
  }

  if (cart.items.length === 0) {
    return (
      <div className="container"><div className="empty" style={{ margin: '3rem 0' }}><h3>سلتك فارغة</h3><p style={{ marginBlockEnd: '1rem' }}>أضف منتجات قبل إتمام الطلب.</p><Link className="btn" href="/shop">تصفّح المنتجات</Link></div></div>
    );
  }

  const field = (k: keyof Form, label: string, props: InputHTMLAttributes<HTMLInputElement> = {}, full = false, hint?: string) => (
    <div className={`field ${full ? 'full' : ''}`}>
      <label htmlFor={k}>{label}</label>
      <input id={k} className="input" value={form[k]} onChange={set(k)} aria-invalid={!!errors[k]} aria-describedby={errors[k] ? `${k}-err` : undefined} {...props} />
      {hint && !errors[k] && <span className="hint">{hint}</span>}
      {errors[k] && <span className="err" id={`${k}-err`}>{errors[k]}</span>}
    </div>
  );

  return (
    <div className="container">
      <div className="page-title"><h1>إتمام الطلب</h1><p className="muted">املأ بياناتك وسنتصل بك لتأكيد الطلب — الدفع عند الاستلام.</p></div>
      <form className="cart-layout" onSubmit={submit} noValidate>
        <div className="panel">
          <h2>بيانات التوصيل</h2>
          <div className="form-grid">
            {field('customerName', 'الاسم الكامل', { autoComplete: 'name', maxLength: 80, required: true })}
            {field('phone', 'رقم الهاتف', { type: 'tel', inputMode: 'tel', autoComplete: 'tel', dir: 'ltr', maxLength: 20, placeholder: '07XXXXXXXX', required: true })}
            <div className="field">
              <label htmlFor="wilayaCode">الولاية</label>
              <select id="wilayaCode" className="select" value={form.wilayaCode} onChange={set('wilayaCode')} aria-invalid={!!errors.wilayaCode} required>
                <option value="">{rates === null ? 'جارٍ التحميل…' : 'اختر الولاية'}</option>
                {rates?.map((r) => <option key={r.wilayaCode} value={r.wilayaCode}>{String(r.wilayaCode).padStart(2, '0')} - {r.wilayaName}</option>)}
              </select>
              {errors.wilayaCode && <span className="err">{errors.wilayaCode}</span>}
            </div>
            {field('commune', 'البلدية', { autoComplete: 'address-level2', maxLength: 80, required: true })}
            {field('address', 'العنوان (اختياري)', { autoComplete: 'street-address', maxLength: 200 }, true, 'الحي، الشارع، أقرب معلم')}
            <div className="field full">
              <label htmlFor="note">ملاحظة (اختياري)</label>
              <textarea id="note" className="textarea" value={form.note} onChange={set('note')} maxLength={300} />
            </div>
            {/* Honeypot — invisible to people, irresistible to bots. */}
            <div className="hp" aria-hidden="true"><label>الموقع<input tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} /></label></div>
          </div>
          {serverError && <div className="notice bad" style={{ marginBlockStart: '1rem' }} role="alert">{serverError}</div>}
        </div>

        <aside className="panel" style={{ position: 'sticky', insetBlockStart: 130 }}>
          <h2>ملخص الطلب</h2>
          {cart.items.map((i) => (
            <div key={i.productId} className="row" style={{ paddingBlock: '.4rem' }}>
              <div style={{ width: 48, height: 48, borderRadius: 8, overflow: 'hidden', flex: 'none', border: '1px solid var(--line)' }}>
                {i.image ? <Img id={i.image} alt="" width={48} ratio="1:1" /> : <div className="noimg"><BoxIcon /></div>}
              </div>
              <span className="grow" style={{ fontSize: '.92rem' }}>{i.name} <span className="muted">× <span className="num">{i.quantity}</span></span></span>
              <b className="num" style={{ fontSize: '.92rem' }}>{formatNumber(i.price * i.quantity)}</b>
            </div>
          ))}
          <div style={{ borderBlockStart: '1px solid var(--line)', marginBlockStart: '.6rem', paddingBlockStart: '.4rem' }}>
            <div className="summary-row"><span>المجموع</span><span><span className="num">{formatNumber(cart.subtotal)}</span> دج</span></div>
            <div className="summary-row">
              <span>التوصيل</span>
              <span>{!rate ? 'اختر الولاية' : rate.price === null ? 'يُحدَّد عند التأكيد' : rate.price === 0 ? 'مجاني' : <><span className="num">{formatNumber(rate.price)}</span> دج</>}</span>
            </div>
            <div className="summary-row total"><span>الإجمالي</span><span><span className="num">{formatNumber(total)}</span> دج</span></div>
          </div>
          {rate && rate.price === null && <div className="notice warn" style={{ marginBlockStart: '.8rem' }}>سنؤكد سعر التوصيل لولايتك عند الاتصال بك.</div>}
          <button className="btn btn-block" style={{ marginBlockStart: '1rem' }} disabled={busy} type="submit">
            {busy ? <span className="spinner" aria-label="جارٍ الإرسال" /> : 'تأكيد الطلب'}
          </button>
          <p className="muted center" style={{ fontSize: '.82rem', marginBlockStart: '.7rem' }}>بالضغط على «تأكيد الطلب» توافق على الدفع نقدًا عند الاستلام.</p>
        </aside>
      </form>
    </div>
  );
}
