export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { handleCtx, json, readJson } from '@/lib/http';
import { requireAdmin } from '@/lib/auth';
import { getId, type IdCtx } from '@/lib/route';
import { bannerSchema } from '@/lib/validators';
import { deleteBanner, updateBanner } from '@/lib/data/misc';
import { revalidateStorefront } from '@/lib/revalidate';

export const PUT = handleCtx(async (req, ctx: IdCtx) => {
  await requireAdmin(req);
  await updateBanner(await getId(ctx), await readJson(req, bannerSchema));
  await revalidateStorefront();
  return json({ ok: true });
});

export const DELETE = handleCtx(async (req, ctx: IdCtx) => {
  await requireAdmin(req);
  await deleteBanner(await getId(ctx));
  await revalidateStorefront();
  return json({ ok: true });
});
