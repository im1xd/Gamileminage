// Applies db/schema.sql and db/seed.sql to DATABASE_URL. Idempotent — safe to re-run.
//   DATABASE_URL=postgresql://… node scripts/migrate.mjs
import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}
const sql = neon(url);

function statements(file) {
  const text = readFileSync(new URL(`../db/${file}`, import.meta.url), 'utf8')
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
  return text.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean);
}

for (const file of ['schema.sql', 'seed.sql']) {
  const list = statements(file);
  for (const [i, statement] of list.entries()) {
    try {
      await sql.query(statement);
    } catch (error) {
      console.error(`✗ ${file} statement ${i + 1} failed:\n${statement.slice(0, 200)}\n`, error);
      process.exit(1);
    }
  }
  console.log(`✓ ${file} (${list.length} statements)`);
}
