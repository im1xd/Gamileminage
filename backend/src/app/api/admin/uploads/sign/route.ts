export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { handle, json, readJson } from '@/lib/http';
import { requireAdmin } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { signUpload } from '@/lib/cloudinary';
import { uploadSignSchema } from '@/lib/validators';

export const POST = handle(async (req) => {
  const admin = await requireAdmin(req);
  await rateLimit(`upload:${admin.id}`, 300, 3600);
  const { folder } = await readJson(req, uploadSignSchema, 500);
  return json(signUpload(folder));
});
