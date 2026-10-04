import Link from 'next/link';
import type { CategoryNode, Settings } from '@/lib/types';
import { STORE_NAME_FALLBACK } from '@/lib/site';
import { CartButton } from './CartButton';
import { SearchIcon } from './icons';

export function SiteHeader({ settings, categories }: { settings: Settings; categories: CategoryNode[] }) {
  const name = settings.store_name || STORE_NAME_FALLBACK;
  return (
    <>
      {settings.announcement && <div className="announce">{settings.announcement}</div>}
      <header className="site-header">
        <div className="container header-main">
          <Link href="/" className="logo" aria-label={name}>
            <span className="logo-mark" aria-hidden>G</span>
            <span>{name}<small>أواني وأدوات منزلية</small></span>
          </Link>
          <form className="search" action="/shop" role="search">
            <label className="sr-only" htmlFor="q">ابحث في المتجر</label>
            <input id="q" name="q" type="search" placeholder="ابحث عن منتج…" maxLength={80} autoComplete="off" />
            <button type="submit" aria-label="بحث"><SearchIcon /></button>
          </form>
          <div className="header-actions"><CartButton /></div>
        </div>
        <nav className="nav-bar" aria-label="الأقسام">
          <div className="container nav-scroll">
            <Link className="nav-link" href="/shop">كل المنتجات</Link>
            {categories.slice(0, 8).map((c) => (
              <Link key={c.id} className="nav-link" href={`/category/${encodeURIComponent(c.slug)}`}>{c.name}</Link>
            ))}
            <Link className="nav-link hot" href="/shop?onSale=1">العروض</Link>
          </div>
        </nav>
      </header>
    </>
  );
}
