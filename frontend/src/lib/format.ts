export const formatNumber = (n: number): string => new Intl.NumberFormat('en-US').format(n);
export const formatPrice = (n: number): string => `${formatNumber(n)} دج`;

export function formatDate(iso: string, withTime = true): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('ar-DZ-u-nu-latn', {
    timeZone: 'Africa/Algiers',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(d);
}

/** Dates coming from Postgres `date` columns arrive as 2026-10-03T00:00:00.000Z — keep only the day. */
export const dayLabel = (iso: string): string => {
  const [, m, d] = iso.slice(0, 10).split('-');
  return `${Number(d)}/${Number(m)}`;
};

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'الآن';
  if (min < 60) return `منذ ${min} د`;
  const h = Math.floor(min / 60);
  if (h < 24) return `منذ ${h} س`;
  return `منذ ${Math.floor(h / 24)} يوم`;
}

export const discountPercent = (price: number, compareAt: number | null): number =>
  compareAt && compareAt > price ? Math.round(((compareAt - price) / compareAt) * 100) : 0;

export const STATUS_LABEL: Record<string, string> = {
  new: 'جديد',
  confirmed: 'مؤكد',
  shipped: 'في الطريق',
  delivered: 'تم التسليم',
  cancelled: 'ملغى',
  returned: 'مرتجع',
};
export const STATUS_TONE: Record<string, string> = {
  new: 'info',
  confirmed: 'brand',
  shipped: 'warn',
  delivered: 'ok',
  cancelled: 'bad',
  returned: 'bad',
};
export const STATUS_ORDER = ['new', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'] as const;
