'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container" style={{ textAlign: 'center', padding: '5rem 1rem' }}>
      <h1 style={{ fontSize: '1.8rem', marginBlockEnd: '.7rem' }}>حدث خطأ غير متوقع</h1>
      <p className="muted" style={{ marginBlockEnd: '1.5rem' }}>نعتذر عن ذلك. حاول مرة أخرى بعد قليل.</p>
      <button className="btn" onClick={reset}>إعادة المحاولة</button>
    </div>
  );
}
