import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getCategories, getProducts } from '@/lib/api';
import { CatalogView, type CatalogQuery } from '@/components/Catalog';
import type { CategoryNode } from '@/lib/types';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const SORTS = new Set(['newest', 'popular', 'price_asc', 'price_desc']);

function findCategory(tree: CategoryNode[], slug: string): { node: CategoryNode; parent?: CategoryNode } | null {
  for (const root of tree) {
    if (root.slug === slug) return { node: root };
    const child = root.children?.find((c) => c.slug === slug);
    if (child) return { node: child, parent: root };
  }
  return null;
}
const decode = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = decode((await params).slug);
  const found = findCategory(await getCategories(), slug);
  if (!found) return { title: 'القسم غير موجود' };
  return { title: found.node.name, description: found.node.description || `تسوّق ${found.node.name} من Gamil Minage بأفضل الأسعار` };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const slug = decode((await params).slug);
  const sp = await searchParams;
  const categories = await getCategories();
  const found = findCategory(categories, slug);
  if (!found) notFound();
  const sortRaw = one(sp.sort) ?? 'newest';
  const query: CatalogQuery = {
    category: slug,
    sort: SORTS.has(sortRaw) ? sortRaw : 'newest',
    page: Math.max(1, Math.min(Number.parseInt(one(sp.page) ?? '1', 10) || 1, 500)),
  };
  const result = await getProducts({ category: slug, sort: query.sort, page: query.page, limit: 12 });
  const base = `/category/${encodeURIComponent(slug)}`;
  return (
    <div className="container">
      <nav className="crumbs" aria-label="مسار التصفح">
        <Link href="/">الرئيسية</Link><span aria-hidden>/</span>
        {found.parent && <><Link href={`/category/${encodeURIComponent(found.parent.slug)}`}>{found.parent.name}</Link><span aria-hidden>/</span></>}
        <span>{found.node.name}</span>
      </nav>
      <div className="page-title">
        <h1>{found.node.name}</h1>
        {found.node.description && <p className="muted" style={{ marginBlockStart: '.4rem' }}>{found.node.description}</p>}
      </div>
      <CatalogView base={base} query={query} result={result} categories={categories} activeSlug={slug} />
    </div>
  );
}
