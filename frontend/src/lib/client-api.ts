export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code = 'error',
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

interface Options {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

/** Browser → /api/* (same origin; the Next server forwards it to the private backend). */
export async function api<T = unknown>(path: string, { method = 'GET', body, signal }: Options = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      signal,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    throw new ApiClientError(0, 'تعذّر الاتصال بالخادم، تحقق من الإنترنت', 'network');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const e = data?.error;
    throw new ApiClientError(res.status, e?.message ?? 'حدث خطأ غير متوقع', e?.code, e?.details);
  }
  return data as T;
}

export const errorMessage = (error: unknown): string =>
  error instanceof ApiClientError ? error.message : error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
