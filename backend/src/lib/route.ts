import { notFound } from './http';

export type IdCtx = { params: Promise<{ id: string }> };
export type SlugCtx = { params: Promise<{ slug: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Route ids must be real UUIDs — anything else is a 404 before it can reach the database. */
export async function getId(ctx: IdCtx): Promise<string> {
  const { id } = await ctx.params;
  if (!UUID.test(id)) throw notFound();
  return id;
}
