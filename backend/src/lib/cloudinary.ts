import { v2 as cloudinary } from 'cloudinary';
import { env } from './env';
import { PUBLIC_ID_PATTERN, UPLOAD_ROOT } from './constants';

export const UPLOAD_FOLDERS = ['products', 'categories', 'banners'] as const;
export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

// Uploaded originals are capped at 1600px (after the browser has already compressed them — see frontend/src/lib/upload.ts) so storage stays small; every image is later DELIVERED
// with f_auto,q_auto (see frontend/src/lib/image.ts) so visitors always get the lightest format.
const INCOMING_TRANSFORMATION = 'c_limit,w_1600,h_1600,q_auto:good';
const ALLOWED_FORMATS = 'jpg,jpeg,png,webp,avif';

function sdk() {
  cloudinary.config({ cloud_name: env.cloudName, api_key: env.cloudKey, api_secret: env.cloudSecret, secure: true });
  return cloudinary;
}

/** Signed parameters so the browser uploads straight to Cloudinary (files never pass through Vercel's 4.5 MB body limit). */
export function signUpload(folder: UploadFolder) {
  const timestamp = Math.floor(Date.now() / 1000);
  const fullFolder = `${UPLOAD_ROOT}/${folder}`;
  const toSign = { timestamp, folder: fullFolder, allowed_formats: ALLOWED_FORMATS, transformation: INCOMING_TRANSFORMATION };
  const signature = sdk().utils.api_sign_request(toSign, env.cloudSecret);
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.cloudName}/image/upload`,
    apiKey: env.cloudKey,
    timestamp,
    signature,
    folder: fullFolder,
    allowedFormats: ALLOWED_FORMATS,
    transformation: INCOMING_TRANSFORMATION,
    maxBytes: 3 * 1024 * 1024,
  };
}

/** Best-effort cleanup — a failed delete must never fail the request that triggered it. */
export async function deleteImages(publicIds: (string | null | undefined)[]): Promise<void> {
  const ids = [...new Set(publicIds.filter((id): id is string => !!id && PUBLIC_ID_PATTERN.test(id)))];
  await Promise.all(
    ids.map((id) =>
      sdk()
        .uploader.destroy(id, { invalidate: true })
        .catch((error: unknown) => console.error('[cloudinary] delete failed', id, error)),
    ),
  );
}
