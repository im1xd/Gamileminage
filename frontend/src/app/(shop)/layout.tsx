import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { getCategories, getSettings } from '@/lib/api';

// Data is fetched with a short Data Cache + on-demand invalidation (see lib/api.ts), so pages stay fast
// but the build never depends on the backend being reachable.
export const dynamic = 'force-dynamic';

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [settings, categories] = await Promise.all([getSettings(), getCategories()]);
  return (
    <>
      <SiteHeader settings={settings} categories={categories} />
      <main id="main">{children}</main>
      <SiteFooter settings={settings} categories={categories} />
    </>
  );
}
