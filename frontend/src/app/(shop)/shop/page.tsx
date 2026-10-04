import type { Metadata } from 'next';
import { getCategories, getProducts } from '@/lib/api';
import { CatalogView, type CatalogQuery } from '@/components/Catalog';

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const SORTS = new Set(['newest', 'popular', 'price_asc', 'price_desc']);

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const sp = await searchParams;
  const q = one(sp.q)?.slice(0, 80);
  return { title: q ? `نتائج البحث: ${q}` : one(sp.onSale) ? 'العروض والتخفيضات' : 'كل المنتجات', robots: q ? { index: false, follow: true } : undefined };
}

export default async function ShopPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const sortRaw = one(sp.sort) ?? 'newest';
  const query: CatalogQuery = {
    q: one(sp.q)?.slice(0, 80) || undefined,
    category: one(sp.category) || undefined,
    sort: SORTS.has(sortRaw) ? sortRaw : 'newest',
    onSale: one(sp.onSale) ? '1' : undefined,
    featured: one(sp.featured) ? '1' : undefined,
    page: Math.max(1, Math.min(Number.parseInt(one(sp.page) ?? '1', 10) || 1, 500)),
  };
  const [result, categories] = await Promise.all([
    getProducts({ q: query.q, category: query.category, sort: query.sort, onSale: query.onSale, featured: query.featured, page: query.page, limit: 12 }),
    getCategories(),
  ]);
  return (
    <div className="container">
      <div className="page-title"><h1>{query.onSale ? 'العروض والتخفيضات' : query.q ? `نتائج: ${query.q}` : 'كل المنتجات'}</h1></div>
      <CatalogView base="/shop" query={query} result={result} categories={categories} />
    </div>
  );
}
