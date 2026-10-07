import Link from 'next/link';
import type { ProductCardData } from '@/lib/types';
import { discountPercent, formatNumber } from '@/lib/format';
import { Img } from './Img';
import { AddToCartButton } from './AddToCart';
import { BoxIcon } from './icons';

export function ProductCard({ p, priority = false }: { p: ProductCardData; priority?: boolean }) {
  const off = discountPercent(p.price, p.compareAtPrice);
  const [first, second] = p.images;
  return (
    <article className="card">
      <div className="card-media">
        {first ? (
          <>
            <Img id={first} alt={p.name} width={320} ratio="4:5" sizes="(max-width: 560px) 46vw, 260px" priority={priority} />
            {second && <Img id={second} alt="" width={320} ratio="4:5" sizes="260px" />}
          </>
        ) : (
          <div className="noimg"><BoxIcon /></div>
        )}
        {off > 0 && p.inStock && <span className="tag tag-sale">-{off}%</span>}
        {!p.inStock && <span className="tag tag-out">نفدت</span>}
        {p.inStock && p.lowStock && <span className="tag tag-low">كمية محدودة</span>}
      </div>
      <div className="card-body">
        {p.categoryName && <span className="card-cat">{p.categoryName}</span>}
        <h3 className="card-title"><Link href={`/product/${encodeURIComponent(p.slug)}`}>{p.name}</Link></h3>
        <div className="price-row">
          <span className="price">{p.priceFrom && <small className="from">من </small>}<span className="num">{formatNumber(p.price)}</span> دج</span>
          {p.compareAtPrice && p.compareAtPrice > p.price && <span className="price-old"><span className="num">{formatNumber(p.compareAtPrice)}</span></span>}
        </div>
        {p.hasOptions ? (
          <Link className={`btn btn-soft btn-sm btn-block card-add ${p.inStock ? '' : 'disabled'}`} aria-disabled={!p.inStock} href={`/product/${encodeURIComponent(p.slug)}`}>
            {p.inStock ? 'اختر اللون / الحجم' : 'نفدت الكمية'}
          </Link>
        ) : (
          <AddToCartButton compact product={{ id: p.id, slug: p.slug, name: p.name, price: p.price, image: first ?? null, maxQty: 20, inStock: p.inStock }} />
        )}
      </div>
    </article>
  );
}

export function ProductGrid({ items }: { items: ProductCardData[] }) {
  return (
    <div className="product-grid">
      {items.map((p, i) => <ProductCard key={p.id} p={p} priority={i < 4} />)}
    </div>
  );
}
