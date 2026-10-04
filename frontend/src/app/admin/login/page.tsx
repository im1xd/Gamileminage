'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { api, errorMessage } from '@/lib/client-api';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      const { admin } = await api<{ admin: { mustChangePassword: boolean } }>('/admin/auth/login', { method: 'POST', body: { username, password } });
      router.replace(admin.mustChangePassword ? '/admin/account' : '/admin');
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card stack" onSubmit={submit} style={{ ['--gap' as string]: '1rem' }}>
        <div className="logo-mark" aria-hidden>G</div>
        <h1 className="center" style={{ fontSize: '1.4rem' }}>لوحة تحكم Gamil Minage</h1>
        <div className="field"><label htmlFor="u">اسم المستخدم</label><input id="u" className="input" dir="ltr" autoComplete="username" autoCapitalize="none" value={username} onChange={(e) => setUsername(e.target.value)} required maxLength={40} /></div>
        <div className="field"><label htmlFor="p">كلمة المرور</label><input id="p" className="input" dir="ltr" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required maxLength={200} /></div>
        {error && <div className="notice bad" role="alert">{error}</div>}
        <button className="btn btn-block" disabled={busy} type="submit">{busy ? <span className="spinner" /> : 'دخول'}</button>
      </form>
    </div>
  );
}
