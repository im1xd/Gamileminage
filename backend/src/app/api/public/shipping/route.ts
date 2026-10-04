export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { handle, json } from '@/lib/http';
import { listShipping } from '@/lib/data/misc';

export const GET = handle(async () => json(await listShipping(true)));
