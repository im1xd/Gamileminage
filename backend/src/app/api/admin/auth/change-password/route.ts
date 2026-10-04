export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { ApiError, handle, json, readJson } from '@/lib/http';
import { changePasswordSchema } from '@/lib/validators';
import { query } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/password';
import { hit, tooMany } from '@/lib/rate-limit';
import { requireAdmin, setSessionCookie, signSession } from '@/lib/auth';

export const POST = handle(async (req) => {
  const admin = await requireAdmin(req, { allowPasswordChange: true });
  const { currentPassword, newPassword } = await readJson(req, changePasswordSchema, 2000);
  const attempts = await hit(`chpw:${admin.id}`, 3600);
  if (attempts.count > 10) throw tooMany(attempts.retryAfter);

  const row = (await query<{ password_hash: string }>(`SELECT password_hash FROM admins WHERE id = $1::uuid`, [admin.id]))[0];
  if (!row || !(await verifyPassword(currentPassword, row.password_hash))) throw new ApiError(400, 'كلمة المرور الحالية غير صحيحة', 'invalid_credentials');
  if (newPassword.toLowerCase().includes(admin.username.toLowerCase())) throw new ApiError(422, 'لا تضع اسم المستخدم داخل كلمة المرور', 'validation');

  // Bumping token_version signs out every other session; the caller gets a fresh cookie.
  const updated = await query<{ token_version: number }>(
    `UPDATE admins SET password_hash = $2::text, must_change_password = false, token_version = token_version + 1
     WHERE id = $1::uuid RETURNING token_version`,
    [admin.id, await hashPassword(newPassword)],
  );
  const res = json({ ok: true });
  setSessionCookie(res, await signSession(admin.id, updated[0].token_version));
  return res;
});
