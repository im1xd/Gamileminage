import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans_Arabic, Reem_Kufi } from 'next/font/google';
import { Toaster } from '@/lib/toast';
import { CartProvider } from '@/lib/cart';
import { SITE_URL } from '@/lib/site';
import './globals.css';

const body = IBM_Plex_Sans_Arabic({ subsets: ['arabic', 'latin'], weight: ['300', '400', '500', '600', '700'], variable: '--font-body', display: 'swap' });
const display = Reem_Kufi({ subsets: ['arabic', 'latin'], weight: ['400', '500', '600', '700'], variable: '--font-display', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Gamil Minage — أواني وأدوات منزلية', template: '%s | Gamil Minage' },
  description: 'متجر Gamil Minage في وادي سوف: أواني مطبخ وأدوات منزلية وديكور، توصيل لجميع الولايات والدفع عند الاستلام.',
  applicationName: 'Gamil Minage',
  openGraph: { type: 'website', locale: 'ar_DZ', siteName: 'Gamil Minage' },
  verification: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION ? { google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION } : undefined,
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: '#12307f', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${body.variable} ${display.variable}`}>
      <body>
        <CartProvider>{children}</CartProvider>
        <Toaster />
      </body>
    </html>
  );
}
