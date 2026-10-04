import { timingSafeEqual } from 'node:crypto';
import { revalidateTag } from 'next/cache';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_TAGS = new Set(['catalog']);

function sameSecret(sent: string, expected: string): boolean {
  const a = Buffer.from(sent);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Called by the backend after every dashboard change so visitors see updates immediately. */
export async function POST(req: NextRequest) {
  const expected = process.env.REVALIDATE_SECRET ?? '';
  if (expected.length < 24 || !sameSecret(req.headers.get('x-revalidate-secret') ?? '', expected)) {
    return Response.json({ ok: false }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { tags?: unknown };
  const tags = Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === 'string' && ALLOWED_TAGS.has(t)) : ['catalog'];
  for (const tag of tags.length ? tags : ['catalog']) revalidateTag(tag);
  return Response.json({ ok: true });
}
