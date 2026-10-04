'use client';

import { useState, type FormEvent } from 'react';
import { api, errorMessage } from '@/lib/client-api';
import { cld } from '@/lib/image';
import { toast } from '@/lib/toast';
import { EditIcon, ImageIcon, PlusIcon } from '@/components/icons';
import { ConfirmButton, ErrorBox, Field, Modal, PageLoading, useApi } from '@/components/admin/ui';
import { ImageUploader, type ImageValue } from '@/components/admin/ImageUploader';
import { Switch } from '@/components/admin/ui';

interface Banner { id: string; title: string; subtitle: string; buttonText: string; linkUrl: string; imagePublicId: string | null; sortOrder: number; isActive: boolean }
interface Draft { id?: string; title: string; subtitle: string; buttonText: string; linkUrl: string; image: ImageValue[]; sortOrder: string; isActive: boolean }
const blank: Draft = { title: '', subtitle: '', buttonText: 'تسوّق الآن', linkUrl: '/shop', image: [], sortOrder: '0', isActive: true };

export default function BannersPage() {
  const { data, error, loading, reload } = useApi<Banner[]>('/admin/banners');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  if (loading && !data) return <PageLoading />;
  if (error || !data) return <ErrorBox message={error || 'تعذّر التحميل'} onRetry={reload} />;

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!draft || busy) return;
    setBusy(true);
    try {
      const body = { title: draft.title, subtitle: draft.subtitle, buttonText: draft.buttonText, linkUrl: draft.linkUrl, imagePublicId: draft.image[0]?.publicId ?? null, sortOrder: Number(draft.sortOrder) || 0, isActive: draft.isActive };
      if (draft.id) await api(`/admin/banners/${draft.id}`, { method: 'PUT', body });
      else await api('/admin/banners', { method: 'POST', body });
      toast('تم الحفظ');
      setDraft(null);
      reload();
    } catch (err) {
      toast(errorMessage(err), 'bad');
    } finally {
      setBusy(false);
    }
  }
  async function remove(b: Banner) {
    try { await api(`/admin/banners/${b.id}`, { method: 'DELETE' }); toast('تم حذف البانر'); reload(); } catch (err) { toast(errorMessage(err), 'bad'); }
  }

  return (
    <div className="card-a">
      <div className="card-head">
        <p className="muted">البانرات هي الشرائح الكبيرة أعلى الصفحة الرئيسية. إن لم تضف أي بانر يظهر تصميم افتراضي.</p>
        <button className="btn btn-sm" onClick={() => setDraft(blank)}><PlusIcon width={16} height={16} /> بانر جديد</button>
      </div>
      {data.length === 0 ? <p className="muted center" style={{ padding: '2rem' }}>لا توجد بانرات.</p> : (
        <div className="table-wrap"><table className="t"><thead><tr><th>البانر</th><th>الرابط</th><th>الترتيب</th><th>الحالة</th><th /></tr></thead><tbody>
          {data.map((b) => (
            <tr key={b.id}>
              <td><div className="row"><div className="thumb-s">{b.imagePublicId ? <img src={cld(b.imagePublicId, { width: 46, ratio: '1:1' })} alt="" width={46} height={46} /> : <div className="noimg"><ImageIcon /></div>}</div><div><b>{b.title || '(بدون عنوان)'}</b><br /><small className="muted">{b.subtitle.slice(0, 50)}</small></div></div></td>
              <td dir="ltr" className="num">{b.linkUrl || '—'}</td><td className="num">{b.sortOrder}</td>
              <td><span className={`pill ${b.isActive ? 'pill-ok' : 'pill-mute'}`}>{b.isActive ? 'ظاهر' : 'مخفي'}</span></td>
              <td><div className="row" style={{ justifyContent: 'flex-end' }}>
                <button className="btn btn-sm btn-soft" onClick={() => setDraft({ id: b.id, title: b.title, subtitle: b.subtitle, buttonText: b.buttonText, linkUrl: b.linkUrl, image: b.imagePublicId ? [{ publicId: b.imagePublicId, alt: '' }] : [], sortOrder: String(b.sortOrder), isActive: b.isActive })}><EditIcon width={15} height={15} /> تعديل</button>
                <ConfirmButton onConfirm={() => remove(b)}>حذف</ConfirmButton>
              </div></td>
            </tr>
          ))}</tbody></table></div>
      )}
      {draft && (
        <Modal title={draft.id ? 'تعديل البانر' : 'بانر جديد'} onClose={() => setDraft(null)}>
          <form onSubmit={save} className="stack" style={{ ['--gap' as string]: '1rem' }}>
            <Field label="العنوان"><input className="input" maxLength={100} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field>
            <Field label="نص فرعي"><textarea className="textarea" rows={2} maxLength={220} value={draft.subtitle} onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })} /></Field>
            <div className="form-grid">
              <Field label="نص الزر"><input className="input" maxLength={40} value={draft.buttonText} onChange={(e) => setDraft({ ...draft, buttonText: e.target.value })} /></Field>
              <Field label="الرابط" hint="مثال: /shop أو /category/pots"><input className="input" dir="ltr" maxLength={300} value={draft.linkUrl} onChange={(e) => setDraft({ ...draft, linkUrl: e.target.value })} /></Field>
            </div>
            <Field label="الصورة" hint="يفضّل صورة عمودية واضحة للمنتج"><ImageUploader folder="banners" value={draft.image} onChange={(v) => setDraft({ ...draft, image: v.slice(-1) })} max={1} ratio="4:5" /></Field>
            <Field label="الترتيب"><input className="input" dir="ltr" inputMode="numeric" value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: e.target.value.replace(/[^\d-]/g, '') })} /></Field>
            <div className="row"><Switch checked={draft.isActive} onChange={(v) => setDraft({ ...draft, isActive: v })} label="ظاهر" /><span>ظاهر في المتجر</span></div>
            <div className="modal-actions"><button className="btn" disabled={busy} type="submit">{busy ? <span className="spinner" /> : 'حفظ'}</button><button className="btn btn-ghost" type="button" onClick={() => setDraft(null)}>إلغاء</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}
