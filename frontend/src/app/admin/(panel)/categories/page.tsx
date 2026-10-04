'use client';

import { useState, type FormEvent } from 'react';
import { api, errorMessage } from '@/lib/client-api';
import { cld } from '@/lib/image';
import { toast } from '@/lib/toast';
import { EditIcon, ImageIcon, PlusIcon } from '@/components/icons';
import { ConfirmButton, ErrorBox, Field, Modal, PageLoading, Switch, useApi } from '@/components/admin/ui';
import { ImageUploader, type ImageValue } from '@/components/admin/ImageUploader';

interface Cat { id: string; parentId: string | null; name: string; slug: string; description: string; imagePublicId: string | null; sortOrder: number; isActive: boolean; productCount: number; childrenCount: number }
interface Draft { id?: string; name: string; parentId: string; description: string; image: ImageValue[]; sortOrder: string; isActive: boolean }
const blank = (parentId = ''): Draft => ({ name: '', parentId, description: '', image: [], sortOrder: '0', isActive: true });

export default function CategoriesPage() {
  const { data, error, loading, reload } = useApi<Cat[]>('/admin/categories');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  if (loading && !data) return <PageLoading />;
  if (error || !data) return <ErrorBox message={error || 'تعذّر التحميل'} onRetry={reload} />;
  const roots = data.filter((c) => !c.parentId);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!draft || busy) return;
    if (draft.name.trim().length < 2) { toast('اسم القسم مطلوب', 'bad'); return; }
    setBusy(true);
    try {
      const body = { name: draft.name, parentId: draft.parentId || null, description: draft.description, imagePublicId: draft.image[0]?.publicId ?? null, sortOrder: Number(draft.sortOrder) || 0, isActive: draft.isActive };
      if (draft.id) await api(`/admin/categories/${draft.id}`, { method: 'PUT', body });
      else await api('/admin/categories', { method: 'POST', body });
      toast('تم الحفظ');
      setDraft(null);
      reload();
    } catch (err) {
      toast(errorMessage(err), 'bad');
    } finally {
      setBusy(false);
    }
  }
  async function remove(c: Cat) {
    try {
      const r = await api<{ detachedProducts: number }>(`/admin/categories/${c.id}`, { method: 'DELETE' });
      toast(r.detachedProducts ? `تم الحذف — ${r.detachedProducts} منتج أصبح بلا قسم` : 'تم حذف القسم');
      reload();
    } catch (err) {
      toast(errorMessage(err), 'bad');
    }
  }
  const edit = (c: Cat) => setDraft({ id: c.id, name: c.name, parentId: c.parentId ?? '', description: c.description, image: c.imagePublicId ? [{ publicId: c.imagePublicId, alt: '' }] : [], sortOrder: String(c.sortOrder), isActive: c.isActive });

  const row = (c: Cat, sub = false) => (
    <tr key={c.id}>
      <td style={{ paddingInlineStart: sub ? '2rem' : undefined }}>
        <div className="row"><div className="thumb-s">{c.imagePublicId ? <img src={cld(c.imagePublicId, { width: 46, ratio: '1:1' })} alt="" width={46} height={46} /> : <div className="noimg"><ImageIcon /></div>}</div>
          <div><b>{sub && '↳ '}{c.name}</b><br /><small className="muted num">/{c.slug}</small></div></div>
      </td>
      <td className="num">{c.productCount}</td>
      <td className="num">{c.sortOrder}</td>
      <td><span className={`pill ${c.isActive ? 'pill-ok' : 'pill-mute'}`}>{c.isActive ? 'ظاهر' : 'مخفي'}</span></td>
      <td><div className="row" style={{ justifyContent: 'flex-end' }}>
        {!sub && <button className="btn btn-sm btn-ghost" onClick={() => setDraft(blank(c.id))}><PlusIcon width={14} height={14} /> فرعي</button>}
        <button className="btn btn-sm btn-soft" onClick={() => edit(c)}><EditIcon width={15} height={15} /> تعديل</button>
        <ConfirmButton onConfirm={() => remove(c)}>حذف</ConfirmButton>
      </div></td>
    </tr>
  );

  return (
    <div className="card-a">
      <div className="card-head">
        <p className="muted">نظّم متجرك في أقسام رئيسية وفرعية. الأرقام الأصغر تظهر أولاً.</p>
        <button className="btn btn-sm" onClick={() => setDraft(blank())}><PlusIcon width={16} height={16} /> قسم جديد</button>
      </div>
      <div className="table-wrap"><table className="t"><thead><tr><th>القسم</th><th>المنتجات</th><th>الترتيب</th><th>الحالة</th><th /></tr></thead>
        <tbody>{roots.map((r) => [row(r), ...data.filter((c) => c.parentId === r.id).map((c) => row(c, true))])}</tbody></table></div>
      {data.length === 0 && <p className="muted center" style={{ padding: '2rem' }}>لا توجد أقسام بعد.</p>}

      {draft && (
        <Modal title={draft.id ? 'تعديل القسم' : 'قسم جديد'} onClose={() => setDraft(null)}>
          <form onSubmit={save} className="stack" style={{ ['--gap' as string]: '1rem' }}>
            <Field label="اسم القسم *"><input className="input" value={draft.name} maxLength={80} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
            <Field label="القسم الرئيسي" hint="اتركه فارغًا ليكون قسمًا رئيسيًا">
              <select className="select" value={draft.parentId} onChange={(e) => setDraft({ ...draft, parentId: e.target.value })} disabled={!!draft.id && (data.find((c) => c.id === draft.id)?.childrenCount ?? 0) > 0}>
                <option value="">— قسم رئيسي —</option>
                {roots.filter((r) => r.id !== draft.id).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </Field>
            <Field label="وصف قصير"><textarea className="textarea" rows={2} maxLength={500} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
            <Field label="صورة القسم"><ImageUploader folder="categories" value={draft.image} onChange={(v) => setDraft({ ...draft, image: v.slice(-1) })} max={1} ratio="4:5" /></Field>
            <Field label="الترتيب"><input className="input" inputMode="numeric" dir="ltr" value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: e.target.value.replace(/[^\d-]/g, '') })} /></Field>
            <div className="row"><Switch checked={draft.isActive} onChange={(v) => setDraft({ ...draft, isActive: v })} label="ظاهر" /> <span>ظاهر في المتجر</span></div>
            <div className="modal-actions"><button className="btn" disabled={busy} type="submit">{busy ? <span className="spinner" /> : 'حفظ'}</button><button className="btn btn-ghost" type="button" onClick={() => setDraft(null)}>إلغاء</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}
