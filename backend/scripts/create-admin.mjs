// Creates (or resets) a dashboard admin.
//   DATABASE_URL=… node scripts/create-admin.mjs            (asks for the username and password)
//   DATABASE_URL=… ADMIN_USERNAME=owner ADMIN_PASSWORD='…' node scripts/create-admin.mjs
import { randomBytes, scrypt } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

// Must stay identical to src/lib/password.ts (a test in tests/ checks the two stay compatible).
const N = 2 ** 15, R = 8, P = 1, MAXMEM = 128 * N * R * 2;
const hash = (password) =>
  new Promise((resolve, reject) => {
    const salt = randomBytes(16);
    scrypt(password.normalize('NFKC'), salt, 64, { N, r: R, p: P, maxmem: MAXMEM }, (err, key) =>
      err ? reject(err) : resolve(['scrypt', N, R, P, salt.toString('base64'), key.toString('base64')].join('$')),
    );
  });

async function ask(question, secret = false) {
  let muted = false;
  const out = new Writable({ write(chunk, _enc, cb) { if (!muted) process.stdout.write(chunk); cb(); } });
  const rl = createInterface({ input: process.stdin, output: out, terminal: true });
  const pending = rl.question(question);
  muted = secret;
  const answer = await pending;
  rl.close();
  if (secret) process.stdout.write('\n');
  return answer.trim();
}

const username = process.env.ADMIN_USERNAME || (await ask('Username: '));
const password = process.env.ADMIN_PASSWORD || (await ask('Password (min 10 chars, letters + digits): ', true));
if (!/^[\w.\-]{3,40}$/.test(username)) throw new Error('Username: 3-40 chars (letters, digits, . _ -).');
if (password.length < 10 || !/\d/.test(password) || !/[A-Za-z]/.test(password)) throw new Error('Password is too weak.');

const sql = neon(url);
await sql.query(
  `INSERT INTO admins (username, display_name, password_hash, must_change_password)
   VALUES ($1::text, $1::text, $2::text, false)
   ON CONFLICT (lower(username)) DO UPDATE SET password_hash = EXCLUDED.password_hash, token_version = admins.token_version + 1, is_active = true`,
  [username, await hash(password)],
);
console.log(`✓ admin "${username}" is ready.`);
