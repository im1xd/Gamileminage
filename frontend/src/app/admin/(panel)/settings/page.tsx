'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { api, errorMessage } from '@/lib/client-api';
import { toast } from '@/lib/toast';
import { ErrorBox, Field, PageLoading, useApi } from '@/components/admin/ui';

type S = Record<string, string>;
const FIELDS: { key: string; label: string; hint?: string; ltr?: boolean; area?: boolean; full?: boolean; max: number }[] = [
  { key: 'store_name', label: 'اسم المتجر', max: 80 },
  { key: 'tagline', label: 'الشعار النصي', max: 160, full: true },
  { key: 'announcement', label: 'شريط الإعلان أعلى الموقع', hint: 'اتركه فارغًا لإخفائه', max: 200, full: true },
  { key: 'phone', label: 'رقم الهاتف', ltr: true, max: 30 },
  { key: 'whatsapp', label: 'رقم واتساب', ltr: true, max: 30 },
  { key: 'instagram', label: 'رابط إنستغرام', ltr: true, hint: 'يبدأ بـ https://', max: 300 },
  { key: 'facebook', label: 'رابط فيسبوك', ltr: true, hint: 'يبدأ بـ https://', max: 300 },
  { key: 'address', label: 'العنوان', max: 200 },
  { key: 'map_url', label: 'رابط الخريطة', ltr: true, max: 300 },
  { key: 'working_hours', label: 'أوقات العمل', max: 160, full: true },
  { key: 'about_text', label: 'نص «من نحن»', area: true, full: true, max: 1500 },
  { key: 'seo_description', label: 'وصف المتجر لمحركات البحث', area: true, full: true, hint: 'جملتان تلخصان المتجر (حتى 300 حرف)', max: 300 },
];

export default function SettingsPage() {
  const { data, error, loading, reload } = useApi<S>('/admin/settings');
  const [s, setS] = useState<S>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setS(data); }, [data]);
  if (loading && !data) return <PageLoading />;
  if (error || !data) return <ErrorBox message={error || 'تعذّر التحميل'} onRetry={reload} />;

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = Object.fromEntries(FIELDS.map((f) => [f.key, s[f.key] ?? '']));
      setS(await api<S>('/admin/settings', { method: 'PUT', body: payload }));
      toast('تم حفظ الإعدادات');
    } catch (err) {
      toast(errorMessage(err), 'bad');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="card-a" onSubmit={save}>
      <div className="form-grid">
        {FIELDS.map((f) => (
          <Field key={f.key} label={f.label} hint={f.hint} full={f.full}>
            {f.area
              ? <textarea className="textarea" rows={4} maxLength={f.max} value={s[f.key] ?? ''} onChange={(e) => setS({ ...s, [f.key]: e.target.value })} />
              : <input className="input" dir={f.ltr ? 'ltr' : undefined} maxLength={f.max} value={s[f.key] ?? ''} onChange={(e) => setS({ ...s, [f.key]: e.target.value })} />}
          </Field>
        ))}
      </div>
      <button className="btn" style={{ marginBlockStart: '1.2rem' }} disabled={busy} type="submit">{busy ? <span className="spinner" /> : 'حفظ الإعدادات'}</button>
    </form>
  );
}
