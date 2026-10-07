import Link from 'next/link';
import type { Metadata } from 'next';
import { getHome } from '@/lib/api';
import { Img } from '@/components/Img';
import { CategoryArt } from '@/components/CategoryArt';
import { ProductGrid } from '@/components/ProductCard';
import { CashIcon, ShieldIcon, TruckIcon, WhatsappIcon } from '@/components/icons';
import type { Banner, CategoryNode, ProductCardData } from '@/lib/types';

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getHome();
  return { title: { absolute: `${settings.store_name} — ${settings.tagline}` }, description: settings.seo_description };
}

function Hero({ banners, tagline, name }: { banners: Banner[]; tagline: string; name: string }) {
  const slides: (Banner | null)[] = banners.length ? banners : [null];
  return (
    <section className="hero" aria-label="العروض">
      <div className="hero-slides">
        {slides.map((b, i) => (
          <div className="hero-slide container" key={b?.id ?? 'default'}>
            <div className="hero-copy">
              <span className="hero-kicker">{name}</span>
              <h1>{b?.title || 'كل ما يحتاجه مطبخك وبيتك في مكان واحد'}</h1>
              <p>{b?.subtitle || tagline}</p>
              <Link href={b?.linkUrl || '/shop'} className="btn btn-brass">{b?.buttonText || 'تسوّق الآن'}</Link>
            </div>
            <div className="arch">
              {b?.imagePublicId ? (
                <Img id={b.imagePublicId} alt={b.title || name} width={360} ratio="4:5" sizes="(max-width: 760px) 60vw, 360px" priority={i === 0} />
              ) : (
                <div className="arch-art"><img className="arch-mark" src="/brand/mark.webp" width={121} height={240} alt="" /></div>
              )}
            </div>
          </div>
        ))}
      </div>
      {slides.length > 1 && <div className="hero-dots" aria-hidden>{slides.map((_, i) => <span key={i} />)}</div>}
    </section>
  );
}

function TrustStrip({ whatsapp }: { whatsapp: boolean }) {
  const items = [
    { icon: <TruckIcon />, title: 'توصيل لجميع الولايات', sub: '69 ولاية' },
    { icon: <CashIcon />, title: 'الدفع عند الاستلام', sub: 'ادفع بعد أن تعاين طلبك' },
    { icon: <ShieldIcon />, title: 'منتجات مختارة بعناية', sub: 'جودة نضمنها' },
    { icon: <WhatsappIcon />, title: whatsapp ? 'دعم عبر واتساب' : 'دعم سريع', sub: 'نرد عليك بسرعة' },
  ];
  return (
    <div className="container trust">
      {items.map((it) => (
        <div className="trust-item" key={it.title}>{it.icon}<div><b>{it.title}</b><span>{it.sub}</span></div></div>
      ))}
    </div>
  );
}

function Categories({ items }: { items: CategoryNode[] }) {
  if (!items.length) return null;
  return (
    <section className="section container">
      <div className="section-head"><h2>تسوّق حسب القسم</h2><Link href="/shop" className="link-more">كل المنتجات ←</Link></div>
      <div className="cat-grid">
        {items.map((c) => (
          <Link key={c.id} href={`/category/${encodeURIComponent(c.slug)}`} className="cat-tile">
            <div className="cat-arch">
              {c.imagePublicId ?? c.coverImage ? (
                <Img id={(c.imagePublicId ?? c.coverImage) as string} alt={c.name} width={200} ratio="4:5" sizes="(max-width: 560px) 44vw, 200px" />
              ) : (
                <CategoryArt slug={c.slug} name={c.name} />
              )}
            </div>
            <b>{c.name}</b>
            <span><span className="num">{c.productCount}</span> منتج</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Section({ title, href, items }: { title: string; href: string; items: ProductCardData[] }) {
  if (!items.length) return null;
  return (
    <section className="section container">
      <div className="section-head"><h2>{title}</h2><Link href={href} className="link-more">عرض الكل ←</Link></div>
      <ProductGrid items={items} />
    </section>
  );
}

export default async function HomePage() {
  const { settings, banners, categories, featured, newest, bestsellers, onSale } = await getHome();
  const empty = !featured.length && !newest.length;
  return (
    <>
      <Hero banners={banners} tagline={settings.tagline} name={settings.store_name} />
      <TrustStrip whatsapp={!!settings.whatsapp} />
      <Categories items={categories} />
      <Section title="العروض والتخفيضات" href="/shop?onSale=1" items={onSale} />
      <Section title="منتجات مميزة" href="/shop?sort=popular" items={featured} />
      <Section title="وصل حديثًا" href="/shop?sort=newest" items={newest} />
      <Section title="الأكثر طلبًا" href="/shop?sort=popular" items={bestsellers} />
      {empty && (
        <section className="section container">
          <div className="empty"><h3>نجهّز لكم المنتجات</h3><p>ستظهر المنتجات هنا فور إضافتها من لوحة التحكم.</p></div>
        </section>
      )}
    </>
  );
}
