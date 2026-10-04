import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import { env } from './env';
import { query } from './db';
import { forbidden, unauthorized } from './http';
import { SESSION_COOKIE, SESSION_MAX_AGE } from './constants';

export interface AdminSession {
  id: string;
  username: string;
  displayName: string;
  mustChangePassword: boolean;
}

const key = () => new TextEncoder().encode(env.jwtSecret);

export async function signSession(adminId: string, tokenVersion: number): Promise<string> {
  return new SignJWT({ tv: tokenVersion })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(adminId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(key());
}

export function setSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, secure: env.isProd, sameSite: 'lax', path: '/', maxAge: 0 });
}

/**
 * Verifies the cookie AND re-checks the admin row, so disabling an account or changing
 * its password (token_version) logs every existing session out immediately.
 */
export async function requireAdmin(req: NextRequest, options: { allowPasswordChange?: boolean } = {}): Promise<AdminSession> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) throw unauthorized();
  let adminId = '';
  let tv = -1;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'] });
    adminId = String(payload.sub ?? '');
    tv = Number(payload.tv);
  } catch {
    throw unauthorized('انتهت الجلسة، سجّل الدخول من جديد');
  }
  const rows = await query<{ id: string; username: string; display_name: string; must_change_password: boolean; is_active: boolean; token_version: number }>(
    `SELECT id, username, display_name, must_change_password, is_active, token_version
     FROM admins WHERE id = $1::uuid`,
    [adminId],
  );
  const admin = rows[0];
  if (!admin || !admin.is_active || admin.token_version !== tv) throw unauthorized('انتهت الجلسة، سجّل الدخول من جديد');
  if (admin.must_change_password && !options.allowPasswordChange) {
    throw forbidden('يجب تغيير كلمة المرور أولاً', 'password_change_required');
  }
  return { id: admin.id, username: admin.username, displayName: admin.display_name, mustChangePassword: admin.must_change_password };
}
