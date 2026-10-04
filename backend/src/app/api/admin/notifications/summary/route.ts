export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { handle, json } from '@/lib/http';
import { requireAdmin } from '@/lib/auth';
import { notificationSummary } from '@/lib/data/misc';

/** Polled by the dashboard bell every few seconds: one cheap query pair. */
export const GET = handle(async (req) => {
  await requireAdmin(req);
  return json(await notificationSummary());
});
