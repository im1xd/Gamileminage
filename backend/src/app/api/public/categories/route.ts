export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { handle, json } from '@/lib/http';
import { listPublicCategories } from '@/lib/data/categories';

export const GET = handle(async () => json(await listPublicCategories()));
