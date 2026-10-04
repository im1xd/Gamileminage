export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { handle, json } from '@/lib/http';
import { listSlugsForSitemap } from '@/lib/data/products';

export const GET = handle(async () => json(await listSlugsForSitemap()));
