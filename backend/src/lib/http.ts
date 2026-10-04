import { NextRequest, NextResponse } from 'next/server';
import type { ZodTypeAny, z } from 'zod';
import { createHash } from 'node:crypto';
import { env } from './env';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: string = 'error',
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, details?: unknown) => new ApiError(400, message, 'bad_request', details);
export const unauthorized = (message = 'يجب تسجيل الدخول أولاً') => new ApiError(401, message, 'unauthorized');
export const forbidden = (message = 'غير مسموح', code = 'forbidden') => new ApiError(403, message, code);
export const notFound = (message = 'غير موجود') => new ApiError(404, message, 'not_found');
export const conflict = (message: string) => new ApiError(409, message, 'conflict');

export function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

function errorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    const headers: Record<string, string> = { 'Cache-Control': 'no-store' };
    const body = { error: { code: error.code, message: error.message, details: error.details } };
    const retry = (error.details as { retryAfter?: number } | undefined)?.retryAfter;
    if (error.status === 429 && retry) headers['Retry-After'] = String(retry);
    return NextResponse.json(body, { status: error.status, headers });
  }
  // Unknown failure: log the real error on the server, never leak it to the client.
  const pgCode = (error as { code?: string } | null)?.code;
  console.error('[api] unhandled error:', error);
  if (pgCode === '23505') return errorResponse(conflict('القيمة موجودة مسبقًا'));
  if (pgCode === '23503') return errorResponse(conflict('لا يمكن إتمام العملية لوجود بيانات مرتبطة'));
  return NextResponse.json(
    { error: { code: 'server_error', message: 'حدث خطأ غير متوقع، حاول مرة أخرى' } },
    { status: 500, headers: { 'Cache-Control': 'no-store' } },
  );
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defence for state-changing requests (on top of SameSite=Lax cookies):
 * browsers always attach Origin to POST/PUT/PATCH/DELETE, and it must be one of our own sites.
 */
export function assertTrustedOrigin(req: NextRequest): void {
  if (SAFE_METHODS.has(req.method)) return;
  const origin = req.headers.get('origin')?.replace(/\/+$/, '');
  if (!origin || !env.allowedOrigins.includes(origin)) throw forbidden('طلب مرفوض', 'bad_origin');
}

async function guarded(req: NextRequest, run: () => Promise<Response>): Promise<Response> {
  try {
    assertTrustedOrigin(req);
    return await run();
  } catch (error) {
    return errorResponse(error);
  }
}

/** Wraps a route handler: origin check + uniform JSON errors + no stack-trace leaks. */
export function handle(fn: (req: NextRequest) => Promise<Response>) {
  return (req: NextRequest): Promise<Response> => guarded(req, () => fn(req));
}

/** Same as handle(), for dynamic segments ([id], [slug]) — the context type must be spelled out for Next's route type check. */
export function handleCtx<C>(fn: (req: NextRequest, ctx: C) => Promise<Response>) {
  return (req: NextRequest, ctx: C): Promise<Response> => guarded(req, () => fn(req, ctx));
}

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'بيانات غير صالحة';
}

export async function readJson<S extends ZodTypeAny>(req: NextRequest, schema: S, maxChars = 100_000): Promise<z.infer<S>> {
  const type = (req.headers.get('content-type') ?? '').toLowerCase();
  if (!type.startsWith('application/json')) throw new ApiError(415, 'نوع الطلب غير مدعوم', 'unsupported_media_type');
  const text = await req.text();
  if (text.length > maxChars) throw new ApiError(413, 'حجم الطلب كبير جدًا', 'payload_too_large');
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw badRequest('صيغة JSON غير صالحة');
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new ApiError(422, firstIssue(parsed.error), 'validation', parsed.error.flatten().fieldErrors);
  return parsed.data;
}

export function readQuery<S extends ZodTypeAny>(req: NextRequest, schema: S): z.infer<S> {
  const parsed = schema.safeParse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  if (!parsed.success) throw new ApiError(422, firstIssue(parsed.error), 'validation', parsed.error.flatten().fieldErrors);
  return parsed.data;
}

/** The frontend proxy forwards the visitor's real IP; the middleware guarantees the proxy secret was valid. */
export function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-client-ip')?.trim();
  if (forwarded && forwarded.length <= 64) return forwarded;
  return req.headers.get('x-real-ip')?.trim().slice(0, 64) || 'unknown';
}

export function hashIp(ip: string): string {
  return createHash('sha256').update(`${ip}|${env.jwtSecret}`).digest('hex').slice(0, 32);
}

export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export function paging(page: number, limit: number): { limit: number; offset: number } {
  return { limit, offset: (page - 1) * limit };
}
