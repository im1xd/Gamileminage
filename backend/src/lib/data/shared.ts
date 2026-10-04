import type { Tx } from '../db';
import { query } from '../db';

/** Appends a value to the parameter list and returns its placeholder ($1, $2 …). Values NEVER go into the SQL text. */
export function param(params: unknown[], value: unknown): string {
  params.push(value);
  return `$${params.length}`;
}

type Runner = Pick<Tx, 'query'>;

/** First free slug: base, base-2, base-3 … (table name is a fixed literal, never user input). */
export async function uniqueSlug(table: 'products' | 'categories', base: string, excludeId: string | null = null, runner: Runner = { query }): Promise<string> {
  const rows = await runner.query<{ slug: string }>(
    `SELECT slug FROM ${table}
     WHERE (slug = $1::text OR slug LIKE $2::text) AND ($3::uuid IS NULL OR id <> $3::uuid)`,
    [base, `${base.replace(/[\\%_]/g, (c) => `\\${c}`)}-%`, excludeId],
  );
  const taken = new Set(rows.map((r) => r.slug));
  if (!taken.has(base)) return base;
  for (let n = 2; n < 1000; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
  return `${base}-${Date.now().toString(36)}`;
}

export const pages = (total: number, limit: number) => Math.max(1, Math.ceil(total / limit));
