export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { handle, json, readJson } from '@/lib/http';
import { requireAdmin } from '@/lib/auth';
import { shippingSchema } from '@/lib/validators';
import { listShipping, updateShipping } from '@/lib/data/misc';
import { revalidateStorefront } from '@/lib/revalidate';

export const GET = handle(async (req) => {
  await requireAdmin(req);
  return json(await listShipping(false));
});

export const PUT = handle(async (req) => {
  await requireAdmin(req);
  const { rates } = await readJson(req, shippingSchema, 30_000);
  await updateShipping(rates);
  await revalidateStorefront();
  return json(await listShipping(false));
});
