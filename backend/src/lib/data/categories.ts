import { query, tx } from '../db';
import { camelize } from '../camel';
import { ApiError, conflict, notFound } from '../http';
import { slugify } from '../slug';
import { deleteImages } from '../cloudinary';
import type { CategoryInput } from '../validators';
import { uniqueSlug } from './shared';

interface CatRow {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string;
  image_public_id: string | null;
  sort_order: number;
  is_active: boolean;
  product_count: number;
}

const COLUMNS = `c.id, c.parent_id, c.name, c.slug, c.description, c.image_public_id, c.sort_order, c.is_active,
  (SELECT COUNT(*)::int FROM products p WHERE p.category_id = c.id AND p.is_active = true) AS product_count`;

/** Active categories as a two-level tree; a parent's count includes its children. */
export async function listPublicCategories() {
  const rows = await query<CatRow>(`SELECT ${COLUMNS} FROM categories c WHERE c.is_active = true ORDER BY c.sort_order, c.name`);
  const roots = rows.filter((r) => r.parent_id === null);
  const tree = roots.map((root) => {
    const children = rows.filter((r) => r.parent_id === root.id);
    return {
      ...root,
      product_count: root.product_count + children.reduce((sum, c) => sum + c.product_count, 0),
      children,
    };
  });
  return camelize(tree);
}

export async function listAdminCategories() {
  const rows = await query<CatRow & { children_count: number }>(
    `SELECT ${COLUMNS.replace('AND p.is_active = true', '')},
            (SELECT COUNT(*)::int FROM categories ch WHERE ch.parent_id = c.id) AS children_count
     FROM categories c ORDER BY c.sort_order, c.name`,
  );
  return camelize(rows);
}

async function assertValidParent(id: string | null, parentId: string | null) {
  if (!parentId) return;
  if (id && parentId === id) throw new ApiError(422, 'لا يمكن أن يكون القسم فرعًا من نفسه', 'validation');
  const parent = (await query<{ parent_id: string | null }>(`SELECT parent_id FROM categories WHERE id = $1::uuid`, [parentId]))[0];
  if (!parent) throw new ApiError(422, 'القسم الرئيسي غير موجود', 'validation');
  if (parent.parent_id) throw new ApiError(422, 'يمكن إنشاء مستوى واحد فقط من الأقسام الفرعية', 'validation');
  if (id) {
    const kids = await query(`SELECT 1 FROM categories WHERE parent_id = $1::uuid LIMIT 1`, [id]);
    if (kids[0]) throw new ApiError(422, 'هذا القسم له أقسام فرعية، انقلها أولاً', 'validation');
  }
}

export async function createCategory(input: CategoryInput): Promise<string> {
  await assertValidParent(null, input.parentId);
  const slug = await uniqueSlug('categories', slugify(input.name, 'category'));
  const rows = await query<{ id: string }>(
    `INSERT INTO categories (parent_id, name, slug, description, image_public_id, sort_order, is_active)
     VALUES ($1::uuid, $2::text, $3::text, $4::text, $5::text, $6::int, $7::boolean) RETURNING id`,
    [input.parentId, input.name, slug, input.description, input.imagePublicId, input.sortOrder, input.isActive],
  );
  return rows[0].id;
}

export async function updateCategory(id: string, input: CategoryInput): Promise<void> {
  await assertValidParent(id, input.parentId);
  const before = (await query<{ image_public_id: string | null }>(`SELECT image_public_id FROM categories WHERE id = $1::uuid`, [id]))[0];
  if (!before) throw notFound('القسم غير موجود');
  await query(
    `UPDATE categories SET parent_id = $2::uuid, name = $3::text, description = $4::text, image_public_id = $5::text,
            sort_order = $6::int, is_active = $7::boolean, updated_at = now()
     WHERE id = $1::uuid`,
    [id, input.parentId, input.name, input.description, input.imagePublicId, input.sortOrder, input.isActive],
  );
  if (before.image_public_id && before.image_public_id !== input.imagePublicId) await deleteImages([before.image_public_id]);
}

export async function deleteCategory(id: string): Promise<{ detachedProducts: number }> {
  return tx(async (t) => {
    const cat = (await t.query<{ image_public_id: string | null }>(`SELECT image_public_id FROM categories WHERE id = $1::uuid FOR UPDATE`, [id]))[0];
    if (!cat) throw notFound('القسم غير موجود');
    const kids = await t.query(`SELECT 1 FROM categories WHERE parent_id = $1::uuid LIMIT 1`, [id]);
    if (kids[0]) throw conflict('احذف الأقسام الفرعية أو انقلها أولاً');
    const count = (await t.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM products WHERE category_id = $1::uuid`, [id]))[0].n;
    await t.query(`DELETE FROM categories WHERE id = $1::uuid`, [id]);
    await deleteImages([cat.image_public_id]);
    return { detachedProducts: count };
  });
}
