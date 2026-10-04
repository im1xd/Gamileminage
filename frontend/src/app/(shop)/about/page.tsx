import type { Metadata } from 'next';
import { getSettings } from '@/lib/api';

export const metadata: Metadata = { title: 'من نحن' };

export default async function AboutPage() {
  const s = await getSettings();
  return (
    <div className="container" style={{ maxWidth: 780 }}>
      <div className="page-title"><h1>من نحن</h1></div>
      <div className="panel" style={{ marginBlockEnd: '2rem' }}>
        <p className="prose" style={{ fontSize: '1.05rem' }}>{s.about_text}</p>
      </div>
    </div>
  );
}
