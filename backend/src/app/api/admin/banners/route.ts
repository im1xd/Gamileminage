export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { handle, json, readJson } from '@/lib/http';
import { requireAdmin } from '@/lib/auth';
import { bannerSchema } from '@/lib/validators';
import { createBanner, listAdminBanners } from '@/lib/data/misc';
import { revalidateStorefront } from '@/lib/revalidate';

export const GET = handle(async (req) => {
  await requireAdmin(req);
  return json(await listAdminBanners());
});

export const POST = handle(async (req) => {
  await requireAdmin(req);
  const id = await createBanner(await readJson(req, bannerSchema));
  await revalidateStorefront();
  return json({ id }, 201);
});
