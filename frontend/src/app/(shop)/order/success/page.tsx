import Link from 'next/link';
import type { Metadata } from 'next';
import { getSettings } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import { whatsappLink } from '@/lib/site';
import { CheckIcon } from '@/components/icons';

export const metadata: Metadata = { title: 'تم استلام طلبك', robots: { index: false, follow: false } };

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function SuccessPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const number = /^GM-\d{4,10}$/.test(one(sp.n) ?? '') ? (one(sp.n) as string) : null;
  const total = Number.parseInt(one(sp.t) ?? '', 10);
  const pending = one(sp.p) === '1';
  const settings = await getSettings();
  return (
    <div className="container">
      <div className="panel success-card">
        <div className="success-icon"><CheckIcon /></div>
        <h1 style={{ fontSize: '1.7rem' }}>شكرًا لك! تم استلام طلبك</h1>
        {number && <div className="order-no num">{number}</div>}
        <p className="muted">سنتصل بك قريبًا لتأكيد الطلب وترتيب التوصيل.{Number.isFinite(total) && total > 0 && <> المبلغ المطلوب عند الاستلام: <b className="num" style={{ color: 'var(--ink)' }}>{formatNumber(total)} دج</b>{pending ? ' (بدون التوصيل — سنؤكده معك)' : ''}.</>}</p>
        <div className="stack" style={{ marginBlockStart: '1.4rem', ['--gap' as string]: '.7rem' }}>
          {number && <Link className="btn btn-soft btn-block" href="/track">تتبّع طلبك</Link>}
          {settings.whatsapp && <a className="btn btn-whatsapp btn-block" target="_blank" rel="noopener noreferrer" href={whatsappLink(settings.whatsapp, `السلام عليكم، لقد قدّمت طلبًا رقم ${number ?? ''}`)}>تواصل معنا عبر واتساب</a>}
          <Link className="btn btn-ghost btn-block" href="/shop">متابعة التسوق</Link>
        </div>
      </div>
    </div>
  );
}
