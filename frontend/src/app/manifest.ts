import type { MetadataRoute } from 'next';

// Lets customers "Add to Home Screen" on their phone with the shop's own icon and colours.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Gamil Minage — Homeware & Kitchenware',
    short_name: 'Gamil Minage',
    description: 'أواني وأدوات منزلية — توصيل لجميع الولايات والدفع عند الاستلام',
    start_url: '/',
    display: 'standalone',
    lang: 'ar',
    dir: 'rtl',
    background_color: '#ffffff',
    theme_color: '#08224a',
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
