export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { handle, json } from '@/lib/http';
import { clearSessionCookie } from '@/lib/auth';

export const POST = handle(async () => {
  const res = json({ ok: true });
  clearSessionCookie(res);
  return res;
});
