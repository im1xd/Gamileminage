import Link from 'next/link';
import type { Metadata } from 'next';
import { getProduct } from '@/lib/api';
import { cld } from '@/lib/image';
import { discountPercent, formatNumber } from '@/lib/format';
import { SITE_URL, whatsappLink } from '@/lib/site';
import { Gallery } from '@/components/Gallery';
import { ProductBuy } from '@/components/ProductBuy';
import { ProductGrid } from '@/components/ProductCard';
import { CashIcon, ShieldIcon, TruckIcon } from '@/components/icons';
import { getSettings } from '@/lib/api';

type Props = { params: Promise<{ slug: string }> };
const decode = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { product } = await getProduct(decode((await params).slug));
  const image = product.images[0] ? cld(product.images[0].publicId, { width: 1200, ratio: '1:1' }) : undefined;
  const description = (product.description || `${product.name} — الدفع عند الاستلام وتوصيل لجميع الولايات`).replace(/\s+/g, ' ').slice(0, 160);
  return {
    title: product.name,
    description,
    alternates: { canonical: `/product/${encodeURIComponent(product.slug)}` },
    openGraph: { title: product.name, description, type: 'website', images: image ? [{ url: image, width: 1200, height: 1200 }] : undefined },
  };
}

export default async function ProductPage({ params }: Props) {
  const slug = decode((await params).slug);
  const [{ product, related }, settings] = await Promise.all([getProduct(slug), getSettings()]);
  const off = discountPercent(product.price, product.compareAtPrice);
  const url = `${SITE_URL}/product/${encodeURIComponent(product.slug)}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || product.name,
    sku: product.sku || undefined,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    image: product.images.map((i) => cld(i.publicId, { width: 1200, ratio: '1:1' })),
    offers: { '@type': 'Offer', url, priceCurrency: 'DZD', price: product.price, availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', itemCondition: 'https://schema.org/NewCondition' },
  };
  const stock = !product.inStock ? { cls: 'out', text: 'نفدت الكمية' } : product.lowStock ? { cls: 'low', text: 'كمية محدودة — سارع بالطلب' } : { cls: '', text: 'متوفر' };

  return (
    <div className="container">
      {/* JSON-LD is serialised with "<" escaped so product text can never close the script tag. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <nav className="crumbs" aria-label="مسار التصفح">
        <Link href="/">الرئيسية</Link><span aria-hidden>/</span>
        {product.categorySlug && <><Link href={`/category/${encodeURIComponent(product.categorySlug)}`}>{product.categoryName}</Link><span aria-hidden>/</span></>}
        <span>{product.name}</span>
      </nav>
      <div className="pdp">
        <Gallery images={product.images} name={product.name} />
        <div className="pdp-info">
          {product.brand && <span className="muted">{product.brand}</span>}
          <h1>{product.name}</h1>
          <div className="pdp-price">
            <span className="price"><span className="num">{formatNumber(product.price)}</span> دج</span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <>
                <span className="price-old"><span className="num">{formatNumber(product.compareAtPrice)}</span> دج</span>
                <span className="save-chip">وفّر {off}%</span>
              </>
            )}
          </div>
          <span className={`stock-note ${stock.cls}`}>{stock.text}</span>
          <ProductBuy product={{ id: product.id, slug: product.slug, name: product.name, price: product.price, image: product.images[0]?.publicId ?? null, maxQty: product.maxQty, inStock: product.inStock }} />
          {settings.whatsapp && (
            <a className="btn btn-ghost btn-block" target="_blank" rel="noopener noreferrer" href={whatsappLink(settings.whatsapp, `السلام عليكم، أريد الاستفسار عن: ${product.name}\n${url}`)}>
              اسأل عن هذا المنتج عبر واتساب
            </a>
          )}
          <ul className="perks">
            <li><CashIcon /> الدفع عند الاستلام — لا تدفع قبل أن تعاين طلبك</li>
            <li><TruckIcon /> التوصيل إلى جميع الولايات</li>
            <li><ShieldIcon /> منتج أصلي ومضمون</li>
          </ul>
          {product.description && (
            <section style={{ marginBlockStart: '1.6rem' }}>
              <h2 style={{ fontSize: '1.15rem', marginBlockEnd: '.6rem' }}>وصف المنتج</h2>
              <p className="prose">{product.description}</p>
            </section>
          )}
          {product.sku && <p className="muted" style={{ marginBlockStart: '1rem', fontSize: '.85rem' }}>رمز المنتج: <span className="num">{product.sku}</span></p>}
        </div>
      </div>
      {related.length > 0 && (
        <section className="section" style={{ paddingBlockStart: 0 }}>
          <div className="section-head"><h2>منتجات قد تعجبك</h2></div>
          <ProductGrid items={related.slice(0, 4)} />
        </section>
      )}
    </div>
  );
}
