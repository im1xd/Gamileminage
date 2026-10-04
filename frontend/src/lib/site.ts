export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
export const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '';
export const STORE_NAME_FALLBACK = 'Gamil Minage';

/** wa.me wants the international number without + or leading 0. */
export function whatsappLink(phone: string, text?: string): string {
  const digits = phone.replace(/\D/g, '').replace(/^0+/, '').replace(/^213/, '');
  return `https://wa.me/213${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}
export const telLink = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;
