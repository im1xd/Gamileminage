import { NextResponse, type NextRequest } from 'next/server';

// The API is PRIVATE: it only answers requests that carry the shared secret held by the
// frontend server (which proxies the browser). Anyone hitting this URL directly gets a plain 404.

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === '/api/health') return NextResponse.next();
  const expected = process.env.PROXY_SECRET ?? '';
  const sent = req.headers.get('x-proxy-secret') ?? '';
  if (expected.length < 24 || !safeEqual(sent, expected)) {
    return NextResponse.json({ error: { code: 'not_found', message: 'Not found' } }, { status: 404 });
  }
  return NextResponse.next();
}

export const config = { matcher: '/api/:path*' };
