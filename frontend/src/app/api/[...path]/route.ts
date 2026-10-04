import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Same-origin gateway between the browser and the PRIVATE backend. It:
//  • only forwards /api/public/* and /api/admin/*  • adds the shared secret + the visitor's real IP
//  • passes cookies through both ways so the dashboard session (httpOnly) lives on THIS domain.

const ALLOWED_ROOTS = new Set(['public', 'admin']);
const MAX_BODY = 200_000;

async function forward(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }): Promise<Response> {
  const { path } = await ctx.params;
  const base = process.env.BACKEND_URL?.replace(/\/+$/, '');
  const secret = process.env.PROXY_SECRET;
  if (!base || !secret) return Response.json({ error: { code: 'misconfigured', message: 'الخدمة غير مهيأة' } }, { status: 503 });
  if (!path?.length || !ALLOWED_ROOTS.has(path[0]) || path.some((p) => p === '..' || p === '.' || p === '')) {
    return Response.json({ error: { code: 'not_found', message: 'غير موجود' } }, { status: 404 });
  }

  const headers = new Headers({ 'x-proxy-secret': secret, accept: 'application/json' });
  for (const name of ['content-type', 'cookie', 'origin']) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }
  const ip = req.headers.get('x-vercel-forwarded-for') ?? req.headers.get('x-real-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0];
  if (ip) headers.set('x-client-ip', ip.trim().slice(0, 64));

  const init: RequestInit = { method: req.method, headers, redirect: 'manual', cache: 'no-store' };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const body = await req.arrayBuffer();
    if (body.byteLength > MAX_BODY) return Response.json({ error: { code: 'payload_too_large', message: 'حجم الطلب كبير' } }, { status: 413 });
    init.body = body;
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${base}/api/${path.map(encodeURIComponent).join('/')}${req.nextUrl.search}`, init);
  } catch {
    return Response.json({ error: { code: 'upstream_unreachable', message: 'الخادم غير متاح حاليًا، حاول بعد قليل' } }, { status: 502 });
  }

  const out = new Headers({ 'cache-control': 'no-store' });
  const type = upstream.headers.get('content-type');
  if (type) out.set('content-type', type);
  const retry = upstream.headers.get('retry-after');
  if (retry) out.set('retry-after', retry);
  for (const cookie of upstream.headers.getSetCookie()) out.append('set-cookie', cookie);
  return new Response(upstream.body, { status: upstream.status, headers: out });
}

export { forward as GET, forward as POST, forward as PUT, forward as PATCH, forward as DELETE };
