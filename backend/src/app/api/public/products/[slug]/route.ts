export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { handleCtx, json } from '@/lib/http';
import type { SlugCtx } from '@/lib/route';
import { getPublicProduct } from '@/lib/data/products';

export const GET = handleCtx(async (_req, ctx: SlugCtx) => {
  const { slug } = await ctx.params;
  return json(await getPublicProduct(slug));
});
