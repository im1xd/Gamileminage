export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { z } from 'zod';
import { handle, json, readJson } from '@/lib/http';
import { requireAdmin } from '@/lib/auth';
import { markNotificationsRead } from '@/lib/data/misc';

const schema = z.object({ id: z.string().uuid().nullable().optional() });

/** { id } marks one notification as read; an empty body marks all of them. */
export const POST = handle(async (req) => {
  await requireAdmin(req);
  const { id } = await readJson(req, schema, 500);
  await markNotificationsRead(id ?? null);
  return json({ ok: true });
});
