/**
 * Builds a URL slug that keeps Arabic letters (good for SEO) and strips everything unsafe.
 * Diacritics (tashkeel) and tatweel are removed; anything else becomes a dash.
 */
export function slugify(input: string, fallbackPrefix = 'item'): string {
  const cleaned = input
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[^a-z0-9\u0621-\u064A\u0660-\u0669\u06F0-\u06F9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
  return cleaned || `${fallbackPrefix}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Route params may arrive percent-encoded or already decoded depending on the runtime. */
export function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
