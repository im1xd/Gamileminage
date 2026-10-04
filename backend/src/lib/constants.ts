export const UPLOAD_ROOT = 'gamil-minage';
/** Only images stored under our own Cloudinary folder are ever accepted. */
export const PUBLIC_ID_PATTERN = /^gamil-minage\/[A-Za-z0-9_\-/]{1,180}$/;
export const SESSION_COOKIE = 'gm_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
export const ORDER_STATUSES = ['new', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const FINAL_STATUSES: readonly OrderStatus[] = ['cancelled', 'returned'];
