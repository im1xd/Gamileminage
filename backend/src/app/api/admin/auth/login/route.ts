export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { ApiError, clientIp, handle, json, readJson } from '@/lib/http';
import { loginSchema } from '@/lib/validators';
import { query } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/password';
import { hit, isBlocked, tooMany } from '@/lib/rate-limit';
import { setSessionCookie, signSession } from '@/lib/auth';

let dummyHash: Promise<string> | undefined;
/** Verifying against a throw-away hash when the user doesn't exist keeps response time identical (no user enumeration). */
const getDummyHash = () => (dummyHash ??= hashPassword('timing-equaliser-password'));

const WINDOW = 15 * 60;

export const POST = handle(async (req) => {
  const { username, password } = await readJson(req, loginSchema, 2000);
  const ipKey = `login:ip:${clientIp(req)}`;
  const userKey = `login:user:${username.toLowerCase()}`;

  const [ipWait, userWait] = await Promise.all([isBlocked(ipKey, 12, WINDOW), isBlocked(userKey, 6, WINDOW)]);
  if (ipWait || userWait) throw tooMany(Math.max(ipWait, userWait));

  const admin = (
    await query<{ id: string; username: string; display_name: string; password_hash: string; must_change_password: boolean; is_active: boolean; token_version: number }>(
      `SELECT id, username, display_name, password_hash, must_change_password, is_active, token_version
       FROM admins WHERE lower(username) = lower($1::text)`,
      [username],
    )
  )[0];

  const valid = await verifyPassword(password, admin?.password_hash ?? (await getDummyHash()));
  if (!admin || !admin.is_active || !valid) {
    await Promise.all([hit(ipKey, WINDOW), hit(userKey, WINDOW)]);
    throw new ApiError(401, 'اسم المستخدم أو كلمة المرور غير صحيحة', 'invalid_credentials');
  }

  await query(`UPDATE admins SET last_login_at = now() WHERE id = $1::uuid`, [admin.id]);
  const res = json({
    admin: { id: admin.id, username: admin.username, displayName: admin.display_name, mustChangePassword: admin.must_change_password },
  });
  setSessionCookie(res, await signSession(admin.id, admin.token_version));
  return res;
});
