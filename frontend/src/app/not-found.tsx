import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container" style={{ textAlign: 'center', padding: '5rem 1rem' }}>
      <h1 style={{ fontSize: '4rem', color: 'var(--cobalt)' }} className="num">404</h1>
      <h2 style={{ marginBlock: '.5rem 1rem' }}>الصفحة غير موجودة</h2>
      <p className="muted" style={{ marginBlockEnd: '1.5rem' }}>ربما تم نقل الصفحة أو حذفها.</p>
      <Link href="/" className="btn">العودة للرئيسية</Link>
    </div>
  );
}
