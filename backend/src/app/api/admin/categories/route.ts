export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { handle, json, readJson } from '@/lib/http';
import { requireAdmin } from '@/lib/auth';
import { categorySchema } from '@/lib/validators';
import { createCategory, listAdminCategories } from '@/lib/data/categories';
import { revalidateStorefront } from '@/lib/revalidate';

export const GET = handle(async (req) => {
  await requireAdmin(req);
  return json(await listAdminCategories());
});

export const POST = handle(async (req) => {
  await requireAdmin(req);
  const id = await createCategory(await readJson(req, categorySchema));
  await revalidateStorefront();
  return json({ id }, 201);
});
