export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { handle, json, readJson, readQuery } from '@/lib/http';
import { requireAdmin } from '@/lib/auth';
import { adminProductsQuery, productSchema } from '@/lib/validators';
import { createProduct, listAdminProducts } from '@/lib/data/products';
import { revalidateStorefront } from '@/lib/revalidate';

export const GET = handle(async (req) => {
  await requireAdmin(req);
  return json(await listAdminProducts(readQuery(req, adminProductsQuery)));
});

export const POST = handle(async (req) => {
  await requireAdmin(req);
  const id = await createProduct(await readJson(req, productSchema));
  await revalidateStorefront();
  return json({ id }, 201);
});
