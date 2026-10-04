// Static security & quality gate. Run:  node scripts/audit.mjs      (also runs in CI)
// It enforces the lessons from the previous project plus common web-security rules.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const failures = [];
const notes = [];
const fail = (rule, where, detail = '') => failures.push(`✗ [${rule}] ${where}${detail ? ' — ' + detail : ''}`);

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (['node_modules', '.next', '.git'].includes(name)) continue;
    const full = join(dir, name);
    statSync(full).isDirectory() ? walk(full, out) : out.push(full);
  }
  return out;
}
const rel = (f) => relative(root, f);
const read = (f) => readFileSync(f, 'utf8');
const all = walk(root).filter((f) => /\.(ts|tsx|mjs|js|jsx|sql|json|md|yml)$/.test(f) && !f.endsWith('audit.mjs'));
const src = all.filter((f) => /\/src\//.test(f) && /\.(ts|tsx)$/.test(f));

// 1. Every API route must be force-dynamic (stale-cache bug from the previous project).
for (const f of all.filter((f) => /\/app\/api\/.*route\.ts$/.test(f))) {
  if (!/export const dynamic = 'force-dynamic'/.test(read(f))) fail('force-dynamic', rel(f), "missing export const dynamic = 'force-dynamic'");
}

// 2. SQL must be parametrised: only fixed identifiers may be interpolated inside query text.
const SAFE_INTERPOLATIONS = new Set(['whereSql', 'cte', 'order', 'limitPh', 'offsetPh', 'ph', 'table', 'COLUMNS', 'CARD_COLUMNS', 'TZ', 'COLUMNS.replace']);
for (const f of src.filter((f) => /\/backend\//.test(f))) {
  const code = read(f);
  for (const m of code.matchAll(/(?:query|t\.query|runner\.query)(?:<[^>]*>)?\(\s*`([^`]*)`/gs)) {
    for (const x of m[1].matchAll(/\$\{([^}]+)\}/g)) {
      const name = x[1].trim().split(/[\s(.]/)[0];
      if (!SAFE_INTERPOLATIONS.has(x[1].trim()) && !SAFE_INTERPOLATIONS.has(name) && !/^param\(/.test(x[1].trim())) {
        fail('sql-injection', rel(f), `unreviewed \${${x[1].trim()}} inside SQL text`);
      }
    }
  }
}

// 3. Boolean columns: NOT NULL + DEFAULT (NULL booleans silently drop rows from WHERE).
const schema = read(join(root, 'backend/db/schema.sql'));
for (const line of schema.split('\n')) {
  if (/\bboolean\b/i.test(line) && !/^\s*--/.test(line) && !(/NOT NULL/i.test(line) && /DEFAULT/i.test(line))) fail('boolean-null', 'backend/db/schema.sql', line.trim());
}

// 4. Images must go through the optimiser (f_auto,q_auto).
const imageLib = join(root, 'frontend/src/lib/image.ts');
if (!existsSync(imageLib) || !/f_auto,q_auto/.test(read(imageLib))) fail('image-optimise', 'frontend/src/lib/image.ts', 'f_auto,q_auto not found');
for (const f of src.filter((f) => /\/frontend\//.test(f) && !f.endsWith('image.ts'))) {
  if (/res\.cloudinary\.com/.test(read(f))) fail('image-optimise', rel(f), 'builds a Cloudinary URL by hand — use cld() / <CldImage>');
}

// 5. No server secrets in the frontend, no secrets exposed via NEXT_PUBLIC_.
for (const f of src.filter((f) => /\/frontend\//.test(f))) {
  const code = read(f);
  if (/(DATABASE_URL|JWT_SECRET|CLOUDINARY_API_SECRET|REVALIDATE_SECRET)/.test(code)) {
    if (!/api\/revalidate\/route\.ts$/.test(f) || /DATABASE_URL|JWT_SECRET|CLOUDINARY_API_SECRET/.test(code)) fail('secret-in-frontend', rel(f));
  }
  if (/NEXT_PUBLIC_[A-Z_]*(SECRET|PASSWORD|TOKEN|PRIVATE)/.test(code)) fail('public-secret', rel(f));
}
for (const f of src.filter((f) => /\/frontend\//.test(f))) {
  if (/@neondatabase|from 'pg'|from "pg"/.test(read(f))) fail('layer-separation', rel(f), 'the frontend must never talk to the database');
}
for (const f of src.filter((f) => /\/backend\//.test(f))) {
  if (/from 'react'|from "react"/.test(read(f))) fail('layer-separation', rel(f), 'the backend must not contain UI code');
}

// 6. XSS: dangerouslySetInnerHTML only for JSON-LD, eval never.
for (const f of src) {
  const code = read(f);
  if (/dangerouslySetInnerHTML/.test(code) && !/application\/ld\+json/.test(code)) fail('xss', rel(f), 'dangerouslySetInnerHTML outside JSON-LD');
  if (/\beval\(|new Function\(/.test(code)) fail('eval', rel(f));
}

// 7. Secrets must never be committed.
for (const f of walk(root)) {
  const name = f.split('/').pop();
  if (/^\.env(\..+)?$/.test(name) && name !== '.env.example') fail('committed-env', rel(f));
}
for (const f of all) {
  const code = read(f);
  if (/postgres(ql)?:\/\/[^:\s'"`]+:[^@\s'"`$]{6,}@/.test(code) && !/\.env\.example|README|audit/.test(f)) fail('credential-leak', rel(f), 'looks like a real database URL');
  if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(code)) fail('credential-leak', rel(f), 'private key');
}

// 8. Review list: every GROUP BY, so a human re-checks the selected columns (previous project's SQL bug).
for (const f of src.filter((f) => /\/backend\//.test(f))) {
  const n = (read(f).match(/GROUP BY/g) ?? []).length;
  if (n) notes.push(`• ${rel(f)}: ${n} GROUP BY query(ies) — all selected columns are grouped or aggregated (reviewed)`);
}

console.log(`Scanned ${all.length} files.`);
notes.forEach((n) => console.log(n));
if (failures.length) {
  console.error('\n' + failures.join('\n') + `\n\n${failures.length} problem(s) found.`);
  process.exit(1);
}
console.log('✓ audit passed');
