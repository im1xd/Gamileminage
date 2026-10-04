export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { handleCtx, json, readJson } from '@/lib/http';
import { requireAdmin } from '@/lib/auth';
import { getId, type IdCtx } from '@/lib/route';
import { categorySchema } from '@/lib/validators';
import { deleteCategory, updateCategory } from '@/lib/data/categories';
import { revalidateStorefront } from '@/lib/revalidate';

export const PUT = handleCtx(async (req, ctx: IdCtx) => {
  await requireAdmin(req);
  await updateCategory(await getId(ctx), await readJson(req, categorySchema));
  await revalidateStorefront();
  return json({ ok: true });
});

export const DELETE = handleCtx(async (req, ctx: IdCtx) => {
  await requireAdmin(req);
  const result = await deleteCategory(await getId(ctx));
  await revalidateStorefront();
  return json(result);
});
