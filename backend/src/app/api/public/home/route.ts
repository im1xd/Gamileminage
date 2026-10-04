export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { handle, json } from '@/lib/http';
import { getSettings, listPublicBanners } from '@/lib/data/misc';
import { listPublicCategories } from '@/lib/data/categories';
import { listPublicProducts } from '@/lib/data/products';

export const GET = handle(async () => {
  const section = (sort: string, extra: Record<string, string> = {}) =>
    listPublicProducts({ sort, page: 1, limit: 8, ...extra }).then((r) => r.items);
  const [settings, banners, categories, featured, newest, bestsellers, onSale] = await Promise.all([
    getSettings(),
    listPublicBanners(),
    listPublicCategories(),
    section('newest', { featured: '1' }),
    section('newest'),
    section('popular'),
    section('newest', { onSale: '1' }),
  ]);
  return json({ settings, banners, categories, featured, newest, bestsellers, onSale });
});
