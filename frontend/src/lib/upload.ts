import { api } from './client-api';
import { ACCEPTED_TYPES, MAX_INPUT_BYTES, QUALITY_STEPS, TARGET_BYTES, targetSize } from './compress';

export type UploadFolder = 'products' | 'categories' | 'banners';

interface Signature {
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  allowedFormats: string;
  transformation: string;
  maxBytes: number;
}

async function load(file: File): Promise<ImageBitmap> {
  // imageOrientation: 'from-image' applies the EXIF rotation, so phone photos don't end up sideways.
  return createImageBitmap(file, { imageOrientation: 'from-image' });
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Shrinks the photo in the browser BEFORE it leaves the phone/computer:
 * resize to ≤1400px → WebP → lower the quality until the file is ≤ ~350 KB.
 * Saves Cloudinary storage and makes uploads fast on slow mobile connections.
 */
export async function compressImage(file: File): Promise<{ blob: Blob; name: string; saved: number }> {
  if (!ACCEPTED_TYPES.includes(file.type)) throw new Error('الصيغ المسموحة: JPG أو PNG أو WebP');
  if (file.size > MAX_INPUT_BYTES) throw new Error('الصورة كبيرة جدًا (الحد 25 ميغابايت)');

  const bitmap = await load(file).catch(() => {
    throw new Error('تعذّر قراءة الصورة، جرّب صورة أخرى');
  });
  const { width, height } = targetSize(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('المتصفح لا يدعم معالجة الصور');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let best: Blob | null = null;
  for (const quality of QUALITY_STEPS) {
    const blob = await toBlob(canvas, 'image/webp', quality);
    if (!blob) continue;
    best = blob;
    if (blob.size <= TARGET_BYTES) break;
  }
  // Very old browsers can't encode WebP — fall back to JPEG.
  if (!best || best.type !== 'image/webp') best = (await toBlob(canvas, 'image/jpeg', 0.8)) ?? best;
  if (!best) throw new Error('تعذّر ضغط الصورة');

  // Never upload something larger than what the user picked.
  const smaller = best.size < file.size ? best : file;
  const ext = smaller.type === 'image/webp' ? 'webp' : smaller.type === 'image/png' ? 'png' : 'jpg';
  return { blob: smaller, name: `image.${ext}`, saved: Math.max(0, file.size - smaller.size) };
}

export interface UploadedImage {
  publicId: string;
  previewUrl: string;
  originalBytes: number;
  uploadedBytes: number;
}

/** compress → ask our API for a signature → upload straight to Cloudinary. Returns the new public_id. */
export async function uploadImage(file: File, folder: UploadFolder): Promise<UploadedImage> {
  const { blob, name } = await compressImage(file);
  const sig = await api<Signature>('/admin/uploads/sign', { method: 'POST', body: { folder } });
  if (blob.size > sig.maxBytes) throw new Error('الصورة ما زالت كبيرة بعد الضغط، اختر صورة أصغر');

  const form = new FormData();
  form.append('file', blob, name);
  form.append('api_key', sig.apiKey);
  form.append('timestamp', String(sig.timestamp));
  form.append('signature', sig.signature);
  form.append('folder', sig.folder);
  form.append('allowed_formats', sig.allowedFormats);
  form.append('transformation', sig.transformation);

  const res = await fetch(sig.uploadUrl, { method: 'POST', body: form });
  const data = (await res.json().catch(() => null)) as { public_id?: string; error?: { message?: string } } | null;
  if (!res.ok || !data?.public_id) throw new Error(data?.error?.message ?? 'فشل رفع الصورة، حاول مجددًا');
  return { publicId: data.public_id, previewUrl: URL.createObjectURL(blob), originalBytes: file.size, uploadedBytes: blob.size };
}
