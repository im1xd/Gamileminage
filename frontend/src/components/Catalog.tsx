import Link from 'next/link';
import type { CategoryNode, Paged, ProductCardData } from '@/lib/types';
import { ProductGrid } from './ProductCard';

export interface CatalogQuery {
  category?: string;
  q?: string;
  sort: string;
  onSale?: string;
  featured?: string;
  page: number;
}

const SORTS: [string, string][] = [['newest', 'الأحدث'], ['popular', 'الأكثر طلبًا'], ['price_asc', 'السعر: الأقل أولاً'], ['price_desc', 'السعر: الأعلى أولاً']];

export function hrefFor(base: string, q: CatalogQuery, patch: Partial<CatalogQuery>): string {
  const merged = { ...q, ...patch };
  const qs = new URLSearchParams();
  if (merged.q) qs.set('q', merged.q);
  if (merged.category && base === '/shop') qs.set('category', merged.category);
  if (merged.sort && merged.sort !== 'newest') qs.set('sort', merged.sort);
  if (merged.onSale) qs.set('onSale', '1');
  if (merged.featured) qs.set('featured', '1');
  if (merged.page > 1) qs.set('page', String(merged.page));
  const s = qs.toString();
  return s ? `${base}?${s}` : base;
}

export function CatalogView({ base, query, result, categories, activeSlug }: { base: string; query: CatalogQuery; result: Paged<ProductCardData>; categories: CategoryNode[]; activeSlug?: string }) {
  const pagesToShow = Array.from({ length: result.pages }, (_, i) => i + 1).filter((n) => n === 1 || n === result.pages || Math.abs(n - result.page) <= 2);
  return (
    <div className="shop-layout">
      <aside className="filter-box" aria-label="الأقسام">
        <h3>الأقسام</h3>
        <ul className="filter-list">
          <li><Link href="/shop" aria-current={!activeSlug ? 'true' : undefined}>كل المنتجات</Link></li>
          {categories.map((c) => (
            <li key={c.id}>
              <Link href={`/category/${encodeURIComponent(c.slug)}`} aria-current={activeSlug === c.slug ? 'true' : undefined}>{c.name}<span className="muted num">{c.productCount}</span></Link>
              {c.children?.map((s) => (
                <Link key={s.id} className="sub" href={`/category/${encodeURIComponent(s.slug)}`} aria-current={activeSlug === s.slug ? 'true' : undefined}>{s.name}<span className="muted num">{s.productCount}</span></Link>
              ))}
            </li>
          ))}
        </ul>
      </aside>
      <section>
        <div className="toolbar">
          <span className="muted"><span className="num">{result.total}</span> منتج{query.q ? ` لنتائج «${query.q}»` : ''}</span>
          <form action={base} method="get" className="row">
            {query.q && <input type="hidden" name="q" value={query.q} />}
            {query.onSale && <input type="hidden" name="onSale" value="1" />}
            {query.category && base === '/shop' && <input type="hidden" name="category" value={query.category} />}
            <label className="sr-only" htmlFor="sort">الترتيب</label>
            <select id="sort" name="sort" className="select" defaultValue={query.sort}>
              {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <button className="btn btn-soft btn-sm" type="submit">تطبيق</button>
          </form>
        </div>
        {result.items.length ? (
          <ProductGrid items={result.items} />
        ) : (
          <div className="empty"><h3>لا توجد منتجات مطابقة</h3><p>جرّب كلمات أخرى أو تصفّح <Link href="/shop" style={{ color: 'var(--cobalt)' }}>كل المنتجات</Link>.</p></div>
        )}
        {result.pages > 1 && (
          <nav className="pager" aria-label="الصفحات">
            {pagesToShow.map((n, i) => (
              <span key={n} style={{ display: 'contents' }}>
                {i > 0 && pagesToShow[i - 1] !== n - 1 && <span aria-hidden>…</span>}
                {n === result.page ? <span aria-current="page">{n}</span> : <Link href={hrefFor(base, query, { page: n })}>{n}</Link>}
              </span>
            ))}
          </nav>
        )}
      </section>
    </div>
  );
}
