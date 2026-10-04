export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { handle, json } from '@/lib/http';
import { requireAdmin } from '@/lib/auth';
import { dashboardStats } from '@/lib/data/stats';

export const GET = handle(async (req) => {
  await requireAdmin(req);
  return json(await dashboardStats());
});
