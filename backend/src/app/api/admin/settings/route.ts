export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { handle, json, readJson } from '@/lib/http';
import { requireAdmin } from '@/lib/auth';
import { settingsSchema } from '@/lib/validators';
import { getSettings, updateSettings } from '@/lib/data/misc';
import { revalidateStorefront } from '@/lib/revalidate';

export const GET = handle(async (req) => {
  await requireAdmin(req);
  return json(await getSettings());
});

export const PUT = handle(async (req) => {
  await requireAdmin(req);
  await updateSettings(await readJson(req, settingsSchema, 20_000));
  await revalidateStorefront();
  return json(await getSettings());
});
