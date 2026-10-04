import type { Metadata } from 'next';
import { getSettings } from '@/lib/api';
import { telLink, whatsappLink } from '@/lib/site';
import { InstagramIcon, PhoneIcon, PinIcon, WhatsappIcon } from '@/components/icons';

export const metadata: Metadata = { title: 'اتصل بنا' };

export default async function ContactPage() {
  const s = await getSettings();
  return (
    <div className="container" style={{ maxWidth: 780 }}>
      <div className="page-title"><h1>اتصل بنا</h1><p className="muted">يسعدنا أن نخدمك — اختر الطريقة الأنسب لك.</p></div>
      <div className="panel stack" style={{ ['--gap' as string]: '.8rem', marginBlockEnd: '3rem' }}>
        {s.phone && <a className="btn btn-soft btn-block" href={telLink(s.phone)}><PhoneIcon width={20} height={20} /> اتصل: <span className="num">{s.phone}</span></a>}
        {s.whatsapp && <a className="btn btn-whatsapp btn-block" target="_blank" rel="noopener noreferrer" href={whatsappLink(s.whatsapp)}><WhatsappIcon width={20} height={20} /> واتساب</a>}
        {s.instagram && <a className="btn btn-ghost btn-block" target="_blank" rel="noopener noreferrer" href={s.instagram}><InstagramIcon width={20} height={20} /> إنستغرام</a>}
        {s.address && <a className="btn btn-ghost btn-block" target={s.map_url ? '_blank' : undefined} rel="noopener noreferrer" href={s.map_url || undefined}><PinIcon width={20} height={20} /> {s.address}</a>}
        {s.working_hours && <p className="center muted">{s.working_hours}</p>}
      </div>
    </div>
  );
}
