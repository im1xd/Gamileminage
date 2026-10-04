'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { api, errorMessage } from '@/lib/client-api';
import { toast } from '@/lib/toast';
import { Field } from '@/components/admin/ui';

export default function AccountPage() {
  const router = useRouter();
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (next !== again) { setError('كلمتا المرور غير متطابقتين'); return; }
    setBusy(true);
    try {
      await api('/admin/auth/change-password', { method: 'POST', body: { currentPassword: cur, newPassword: next } });
      toast('تم تغيير كلمة المرور');
      window.location.href = '/admin';
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }
  return (
    <form className="card-a stack" style={{ maxWidth: 520, ['--gap' as string]: '1rem' }} onSubmit={submit}>
      <h2>تغيير كلمة المرور</h2>
      <p className="muted">اختر كلمة مرور قوية: 10 أحرف على الأقل وتحتوي على حروف وأرقام. سيُسجَّل خروجك من الأجهزة الأخرى.</p>
      <Field label="كلمة المرور الحالية"><input className="input" dir="ltr" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} required /></Field>
      <Field label="كلمة المرور الجديدة"><input className="input" dir="ltr" type="password" autoComplete="new-password" minLength={10} value={next} onChange={(e) => setNext(e.target.value)} required /></Field>
      <Field label="تأكيد كلمة المرور الجديدة"><input className="input" dir="ltr" type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} required /></Field>
      {error && <div className="notice bad" role="alert">{error}</div>}
      <button className="btn" disabled={busy} type="submit">{busy ? <span className="spinner" /> : 'حفظ'}</button>
    </form>
  );
}
