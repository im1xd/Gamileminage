export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { handle, json, readQuery } from '@/lib/http';
import { publicProductsQuery } from '@/lib/validators';
import { listPublicProducts } from '@/lib/data/products';

export const GET = handle(async (req) => json(await listPublicProducts(readQuery(req, publicProductsQuery))));
