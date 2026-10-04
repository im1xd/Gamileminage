/**
 * Pure maths for image compression (unit-tested; the browser-only part lives in upload.ts).
 * Product photos are shrunk to at most MAX_SIDE px on the long edge — plenty for a zoomable product
 * page — and re-encoded as WebP, which is typically 70-90% smaller than a phone camera JPEG.
 */
export const MAX_SIDE = 1400;
export const TARGET_BYTES = 350 * 1024;
export const QUALITY_STEPS = [0.82, 0.72, 0.62, 0.52] as const;
export const MAX_INPUT_BYTES = 25 * 1024 * 1024;

export function targetSize(width: number, height: number, maxSide = MAX_SIDE): { width: number; height: number } {
  if (!(width > 0) || !(height > 0)) return { width: 0, height: 0 };
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
