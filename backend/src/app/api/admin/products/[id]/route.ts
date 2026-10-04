export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { z } from 'zod';
import { handleCtx, json, readJson } from '@/lib/http';
import { requireAdmin } from '@/lib/auth';
import { getId, type IdCtx } from '@/lib/route';
import { productSchema } from '@/lib/validators';
import { deleteProduct, getAdminProduct, setProductFlags, updateProduct } from '@/lib/data/products';
import { revalidateStorefront } from '@/lib/revalidate';

const flagsSchema = z.object({ isActive: z.boolean().optional(), isFeatured: z.boolean().optional() }).strict();

export const GET = handleCtx(async (req, ctx: IdCtx) => {
  await requireAdmin(req);
  return json(await getAdminProduct(await getId(ctx)));
});

export const PUT = handleCtx(async (req, ctx: IdCtx) => {
  await requireAdmin(req);
  await updateProduct(await getId(ctx), await readJson(req, productSchema));
  await revalidateStorefront();
  return json({ ok: true });
});

/** Quick toggles from the products table (show/hide, feature). */
export const PATCH = handleCtx(async (req, ctx: IdCtx) => {
  await requireAdmin(req);
  await setProductFlags(await getId(ctx), await readJson(req, flagsSchema, 1000));
  await revalidateStorefront();
  return json({ ok: true });
});

export const DELETE = handleCtx(async (req, ctx: IdCtx) => {
  await requireAdmin(req);
  await deleteProduct(await getId(ctx));
  await revalidateStorefront();
  return json({ ok: true });
});
