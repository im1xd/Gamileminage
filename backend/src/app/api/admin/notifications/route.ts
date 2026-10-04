export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { z } from 'zod';
import { handle, json, paging, readQuery } from '@/lib/http';
import { requireAdmin } from '@/lib/auth';
import { listNotifications } from '@/lib/data/misc';

const schema = z.object({ page: z.coerce.number().int().min(1).max(1000).default(1), limit: z.coerce.number().int().min(1).max(50).default(20) });

export const GET = handle(async (req) => {
  await requireAdmin(req);
  const { page, limit } = readQuery(req, schema);
  const p = paging(page, limit);
  return json({ ...(await listNotifications(p.limit, p.offset)), page, limit });
});
