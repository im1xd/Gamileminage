export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { json } from '@/lib/http';

export async function GET() {
  return json({ ok: true });
}
