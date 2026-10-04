export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { handle, json } from '@/lib/http';
import { getSettings } from '@/lib/data/misc';

export const GET = handle(async () => json(await getSettings()));
