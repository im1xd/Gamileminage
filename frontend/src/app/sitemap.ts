import type { MetadataRoute } from 'next';
import { getSitemapData } from '@/lib/api';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const fixed: MetadataRoute.Sitemap = ['', '/shop', '/about', '/contact', '/track'].map((p) => ({ url: `${SITE_URL}${p}`, lastModified: now, changeFrequency: 'weekly', priority: p === '' ? 1 : 0.6 }));
  try {
    const { products, categories } = await getSitemapData();
    return [
      ...fixed,
      ...categories.map((c) => ({ url: `${SITE_URL}/category/${encodeURIComponent(c.slug)}`, lastModified: new Date(c.updatedAt), changeFrequency: 'weekly' as const, priority: 0.7 })),
      ...products.map((p) => ({ url: `${SITE_URL}/product/${encodeURIComponent(p.slug)}`, lastModified: new Date(p.updatedAt), changeFrequency: 'weekly' as const, priority: 0.8 })),
    ];
  } catch {
    return fixed;
  }
}
