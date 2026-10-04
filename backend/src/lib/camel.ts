/* eslint-disable @typescript-eslint/no-explicit-any */
const toCamelKey = (key: string): string => key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

/** snake_case DB rows → camelCase API objects (Dates and primitives are left untouched). */
export function camelize<T = any>(value: unknown): T {
  if (Array.isArray(value)) return value.map((item) => camelize(item)) as unknown as T;
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) out[toCamelKey(key)] = camelize(item);
    return out as T;
  }
  return value as T;
}
