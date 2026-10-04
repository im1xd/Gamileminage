export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { handle, json, readQuery } from '@/lib/http';
import { requireAdmin } from '@/lib/auth';
import { adminOrdersQuery } from '@/lib/validators';
import { listAdminOrders } from '@/lib/data/orders';

export const GET = handle(async (req) => {
  await requireAdmin(req);
  return json(await listAdminOrders(readQuery(req, adminOrdersQuery)));
});
