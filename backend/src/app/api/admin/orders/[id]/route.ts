export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { handleCtx, json, readJson } from '@/lib/http';
import { requireAdmin } from '@/lib/auth';
import { getId, type IdCtx } from '@/lib/route';
import { orderUpdateSchema } from '@/lib/validators';
import { getAdminOrder, updateOrder } from '@/lib/data/orders';

export const GET = handleCtx(async (req, ctx: IdCtx) => {
  await requireAdmin(req);
  return json(await getAdminOrder(await getId(ctx)));
});

export const PATCH = handleCtx(async (req, ctx: IdCtx) => {
  const admin = await requireAdmin(req);
  const id = await getId(ctx);
  await updateOrder(id, admin.id, await readJson(req, orderUpdateSchema, 5000));
  return json(await getAdminOrder(id));
});
