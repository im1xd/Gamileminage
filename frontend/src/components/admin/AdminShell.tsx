'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { api, ApiClientError } from '@/lib/client-api';
import { relativeTime } from '@/lib/format';
import { toast } from '@/lib/toast';
import { BellIcon, BoxIcon, CartIcon, GridIcon, ImageIcon, LogoutIcon, MenuIcon, PhoneIcon, ShieldIcon, TruckIcon, EditIcon } from '../icons';
import { PageLoading } from './ui';

interface Admin { id: string; username: string; displayName: string; mustChangePassword: boolean }
interface Notif { id: string; title: string; body: string; link: string; isRead: boolean; createdAt: string }
interface Summary { unread: number; latest: Notif[] }

const NAV = [
  { href: '/admin', label: 'لوحة التحكم', icon: GridIcon, exact: true },
  { href: '/admin/orders', label: 'الطلبات', icon: CartIcon, badge: true },
  { href: '/admin/products', label: 'المنتجات', icon: BoxIcon },
  { href: '/admin/categories', label: 'الأقسام', icon: EditIcon },
  { href: '/admin/banners', label: 'البانرات', icon: ImageIcon },
  { href: '/admin/shipping', label: 'أسعار التوصيل', icon: TruckIcon },
  { href: '/admin/notifications', label: 'الإشعارات', icon: BellIcon },
  { href: '/admin/settings', label: 'إعدادات المتجر', icon: PhoneIcon },
  { href: '/admin/account', label: 'حسابي', icon: ShieldIcon },
];

function beep() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.42);
    osc.onended = () => void ctx.close();
  } catch {
    /* sound is a nicety — browsers may block it until the first click */
  }
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [summary, setSummary] = useState<Summary>({ unread: 0, latest: [] });
  const [open, setOpen] = useState(false);
  const [bell, setBell] = useState(false);
  const lastUnread = useRef<number | null>(null);

  useEffect(() => {
    api<{ admin: Admin }>('/admin/auth/me')
      .then(({ admin: a }) => {
        setAdmin(a);
        if (a.mustChangePassword && pathname !== '/admin/account') router.replace('/admin/account');
      })
      .catch((e: unknown) => {
        if (e instanceof ApiClientError && e.status === 401) router.replace('/admin/login');
      });
  }, [pathname, router]);

  const poll = useCallback(async () => {
    try {
      const s = await api<Summary>('/admin/notifications/summary');
      if (lastUnread.current !== null && s.unread > lastUnread.current) {
        const fresh = s.latest.find((n) => !n.isRead);
        toast(fresh ? `🔔 ${fresh.title}` : '🔔 إشعار جديد', 'info');
        beep();
      }
      lastUnread.current = s.unread;
      setSummary(s);
    } catch {
      /* transient network errors are ignored; the next tick retries */
    }
  }, []);

  useEffect(() => {
    if (!admin || admin.mustChangePassword) return;
    void poll();
    const id = window.setInterval(() => { if (document.visibilityState === 'visible') void poll(); }, 15000);
    const onVisible = () => document.visibilityState === 'visible' && void poll();
    document.addEventListener('visibilitychange', onVisible);
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, [admin, poll]);

  useEffect(() => {
    document.title = `${summary.unread ? `(${summary.unread}) ` : ''}لوحة التحكم | Gamil Minage`;
  }, [summary.unread, pathname]);

  useEffect(() => { setOpen(false); setBell(false); }, [pathname]);

  async function markRead(n?: Notif) {
    await api('/admin/notifications/read', { method: 'POST', body: n ? { id: n.id } : {} }).catch(() => undefined);
    await poll();
    if (n?.link) router.push(n.link);
  }

  async function logout() {
    await api('/admin/auth/logout', { method: 'POST' }).catch(() => undefined);
    router.replace('/admin/login');
  }

  if (!admin) return <div className="login-wrap"><PageLoading /></div>;
  const current = NAV.find((n) => (n.exact ? pathname === n.href : pathname.startsWith(n.href)));

  return (
    <div className="admin">
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={`admin-side ${open ? 'open' : ''}`}>
        <div className="admin-brand"><img className="brand-mark" src="/brand/mark-light.webp" width={121} height={240} alt="" /><img className="brand-word" src="/brand/wordmark-light.webp" width={440} height={177} alt="Gamil Minage" /></div>
        <nav className="admin-nav" aria-label="لوحة التحكم">
          {NAV.map(({ href, label, icon: Icon, exact, badge }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link key={href} href={href} aria-current={active ? 'page' : undefined}>
                <Icon /> {label}
                {badge && summary.unread > 0 && <span className="count">{summary.unread}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="sp" />
        <Link href="/" target="_blank" className="btn btn-sm btn-ghost" style={{ color: '#fff', borderColor: 'rgb(255 255 255 / 25%)', marginBlockEnd: '.8rem' }}>عرض المتجر ↗</Link>
        <div className="admin-user">
          <b>{admin.displayName || admin.username}</b>
          <button className="link-btn" style={{ color: '#ff9aa8', display: 'inline-flex', gap: '.4rem', alignItems: 'center' }} onClick={logout}><LogoutIcon width={16} height={16} /> تسجيل الخروج</button>
        </div>
      </aside>

      <div className="admin-body">
        <header className="admin-top">
          <button className="icon-btn menu-btn" aria-label="القائمة" onClick={() => setOpen(true)}><MenuIcon /></button>
          <h1>{current?.label ?? 'لوحة التحكم'}</h1>
          <div className="bell-wrap">
            <button className="icon-btn" aria-label={`الإشعارات (${summary.unread})`} aria-expanded={bell} onClick={() => setBell((b) => !b)}>
              <BellIcon />
              {summary.unread > 0 && <span className="badge-dot">{summary.unread > 99 ? '99+' : summary.unread}</span>}
            </button>
            {bell && (
              <div className="bell-pop" role="region" aria-label="الإشعارات">
                <header><span>الإشعارات</span><button className="link-btn" style={{ color: 'var(--cobalt)' }} onClick={() => void markRead()}>تحديد الكل كمقروء</button></header>
                {summary.latest.length === 0 && <p className="muted center" style={{ padding: '1.4rem' }}>لا توجد إشعارات بعد</p>}
                {summary.latest.map((n) => (
                  <button key={n.id} className={`notif ${n.isRead ? '' : 'unread'}`} onClick={() => void markRead(n)}>
                    <b>{n.title}</b><span>{n.body}</span><br /><span>{relativeTime(n.createdAt)}</span>
                  </button>
                ))}
                <Link href="/admin/notifications" className="btn btn-soft btn-sm btn-block" style={{ borderRadius: 0 }}>كل الإشعارات</Link>
              </div>
            )}
          </div>
        </header>
        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}
