import { query } from './db';
import { ApiError } from './http';

/** Registers one hit and reports whether the caller is still within `limit` per `windowSec` (state lives in Postgres, so it works across serverless instances). */
export async function hit(key: string, windowSec: number): Promise<{ count: number; retryAfter: number }> {
  const rows = await query<{ count: number; retry: number }>(
    `INSERT INTO rate_limits (key, count, window_start)
     VALUES ($1::text, 1, now())
     ON CONFLICT (key) DO UPDATE SET
       count = CASE WHEN rate_limits.window_start < now() - make_interval(secs => $2::int) THEN 1 ELSE rate_limits.count + 1 END,
       window_start = CASE WHEN rate_limits.window_start < now() - make_interval(secs => $2::int) THEN now() ELSE rate_limits.window_start END
     RETURNING count,
       GREATEST(1, CEIL(EXTRACT(EPOCH FROM (window_start + make_interval(secs => $2::int) - now()))))::int AS retry`,
    [key, windowSec],
  );
  if (Math.random() < 0.02) void query(`DELETE FROM rate_limits WHERE window_start < now() - interval '2 days'`).catch(() => undefined);
  return { count: rows[0].count, retryAfter: rows[0].retry };
}

/** Read-only check (does not count a hit). */
export async function isBlocked(key: string, limit: number, windowSec: number): Promise<number> {
  const rows = await query<{ retry: number }>(
    `SELECT GREATEST(1, CEIL(EXTRACT(EPOCH FROM (window_start + make_interval(secs => $2::int) - now()))))::int AS retry
     FROM rate_limits
     WHERE key = $1::text AND count >= $3::int AND window_start >= now() - make_interval(secs => $2::int)`,
    [key, windowSec, limit],
  );
  return rows[0]?.retry ?? 0;
}

export function tooMany(retryAfter: number): ApiError {
  return new ApiError(429, 'محاولات كثيرة، حاول لاحقًا', 'rate_limited', { retryAfter });
}

export async function rateLimit(key: string, limit: number, windowSec: number): Promise<void> {
  const { count, retryAfter } = await hit(key, windowSec);
  if (count > limit) throw tooMany(retryAfter);
}
