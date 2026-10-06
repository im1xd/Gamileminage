import Link from 'next/link';
import type { CategoryNode, Settings } from '@/lib/types';
import { STORE_NAME_FALLBACK, telLink, whatsappLink } from '@/lib/site';
import { FacebookIcon, InstagramIcon, PhoneIcon, PinIcon, WhatsappIcon } from './icons';

export function SiteFooter({ settings, categories }: { settings: Settings; categories: CategoryNode[] }) {
  const name = settings.store_name || STORE_NAME_FALLBACK;
  return (
    <>
      {settings.whatsapp && (
        <a className="fab-wa" href={whatsappLink(settings.whatsapp, 'السلام عليكم، أريد الاستفسار عن منتج')} target="_blank" rel="noopener noreferrer" aria-label="تواصل عبر واتساب">
          <WhatsappIcon />
        </a>
      )}
      <footer className="site-footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <img className="footer-logo" src="/brand/logo.webp" width={440} height={752} alt={name} loading="lazy" />
              <p style={{ maxWidth: '34ch', fontSize: '0.94rem' }}>{settings.tagline}</p>
              <div className="social">
                {settings.instagram && <a href={settings.instagram} target="_blank" rel="noopener noreferrer" aria-label="إنستغرام"><InstagramIcon /></a>}
                {settings.facebook && <a href={settings.facebook} target="_blank" rel="noopener noreferrer" aria-label="فيسبوك"><FacebookIcon /></a>}
                {settings.whatsapp && <a href={whatsappLink(settings.whatsapp)} target="_blank" rel="noopener noreferrer" aria-label="واتساب"><WhatsappIcon /></a>}
              </div>
            </div>
            <div>
              <h4>الأقسام</h4>
              <ul>
                {categories.slice(0, 6).map((c) => <li key={c.id}><Link href={`/category/${encodeURIComponent(c.slug)}`}>{c.name}</Link></li>)}
              </ul>
            </div>
            <div>
              <h4>المتجر</h4>
              <ul>
                <li><Link href="/shop">كل المنتجات</Link></li>
                <li><Link href="/shop?onSale=1">العروض</Link></li>
                <li><Link href="/track">تتبّع طلبك</Link></li>
                <li><Link href="/about">من نحن</Link></li>
                <li><Link href="/contact">اتصل بنا</Link></li>
              </ul>
            </div>
            <div>
              <h4>تواصل معنا</h4>
              <ul>
                {settings.phone && <li style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}><PhoneIcon width={18} height={18} /><a href={telLink(settings.phone)}><span className="num">{settings.phone}</span></a></li>}
                {settings.address && <li style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}><PinIcon width={18} height={18} />{settings.map_url ? <a href={settings.map_url} target="_blank" rel="noopener noreferrer">{settings.address}</a> : settings.address}</li>}
                {settings.working_hours && <li>{settings.working_hours}</li>}
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} {name}. جميع الحقوق محفوظة.</span>
            <span>الدفع عند الاستلام • توصيل لجميع الولايات</span>
          </div>
        </div>
      </footer>
    </>
  );
}
