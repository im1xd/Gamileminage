import { neon, Pool } from '@neondatabase/serverless';
import { env } from './env';

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Row = Record<string, any>;

type Sql = ReturnType<typeof neon>;
let http: Sql | undefined;

/**
 * Single statement over Neon's HTTP driver (fast, no connection to manage).
 * ALWAYS pass user input through `params` — never concatenate it into `text`.
 * Nullable params must be cast inside the SQL ($1::text, $2::uuid, $3::boolean …),
 * otherwise Postgres fails with "could not determine data type of parameter".
 */
export async function query<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  http ??= neon(env.databaseUrl);
  const rows = await http.query(text, params as any[]);
  return rows as unknown as T[];
}

export interface Tx {
  query<T = Row>(text: string, params?: unknown[]): Promise<T[]>;
}

/** Interactive transaction (BEGIN … COMMIT) for writes that touch several tables. */
export async function tx<T>(work: (t: Tx) => Promise<T>): Promise<T> {
  const pool = new Pool({ connectionString: env.databaseUrl });
  // An idle-connection error must be logged, never crash the function.
  pool.on('error', (error: unknown) => console.error('[db] pool error', error));
  const client = await pool.connect();
  const t: Tx = {
    query: async <R = Row>(text: string, params: unknown[] = []) => {
      const result = await client.query(text, params as any[]);
      return result.rows as unknown as R[];
    },
  };
  try {
    await client.query('BEGIN');
    const result = await work(t);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* the connection is already gone — nothing to roll back */
    }
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
