'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { api, ApiClientError, errorMessage } from '@/lib/client-api';
import { toast } from '@/lib/toast';
import { Field, Switch, useApi } from './ui';
import { ImageUploader, type ImageValue } from './ImageUploader';
import { TrashIcon, PlusIcon } from '../icons';

export interface VariantDraft {
  id?: string;
  color: string;
  colorHex: string;
  size: string;
  price: string;
  stock: string;
  imagePublicId: string;
  isActive: boolean;
}

export interface ProductDraft {
  name: string; description: string; price: string; compareAtPrice: string; stock: string; trackStock: boolean;
  categoryId: string; sku: string; brand: string; isActive: boolean; isFeatured: boolean; images: ImageValue[]; variants: VariantDraft[];
}
export const EMPTY_PRODUCT: ProductDraft = { name: '', description: '', price: '', compareAtPrice: '', stock: '1', trackStock: true, categoryId: '', sku: '', brand: '', isActive: true, isFeatured: false, images: [], variants: [] };

/** Common Arabic colour names → swatch colour, so typing «أخضر» fills the swatch automatically. */
const COLOR_HEX: Record<string, string> = {
  'أحمر': '#c62828', 'أزرق': '#1e5fd0', 'أخضر': '#1f5f4a', 'أسود': '#161616', 'أبيض': '#ffffff', 'رمادي': '#8a8d93', 'بنفسجي': '#7b4fb0',
  'موف': '#b48ad6', 'وردي': '#e88fb0', 'زهري': '#e88fb0', 'برتقالي': '#f08a24', 'أصفر': '#f2c230', 'ذهبي': '#c09840', 'فضي': '#c0c4cc',
  'بني': '#7a4a2b', 'بيج': '#d8c3a0', 'كحلي': '#0d2f6b', 'تركوازي': '#1fb5ad', 'سماوي': '#5bb8e8', 'خمري': '#6d1f3a', 'بورجوندي': '#6d1f3a',
  'نحاسي': '#b87333', 'شفاف': '#dfe8ee', 'كريمي': '#f3ead6', 'زيتي': '#6b7a3a', 'رمادي داكن': '#4b4e55', 'أخضر فاتح': '#8fc9a8', 'أزرق فاتح': '#8ec5f0',
};
const hexFor = (name: string): string => COLOR_HEX[name.trim()] ?? COLOR_HEX[name.trim().replace(/^ال/, '')] ?? '';
const keyOf = (v: { color: string; size: string }) => `${v.color.trim().toLowerCase()}|${v.size.trim().toLowerCase()}`;
const splitList = (text: string) => text.split(/[,،\n]/).map((x) => x.trim()).filter(Boolean);

interface Cat { id: string; name: string; parentId: string | null }

export function ProductForm({ id, initial }: { id?: string; initial: ProductDraft }) {
  const router = useRouter();
  const [d, setD] = useState<ProductDraft>(initial);
  const [hasOptions, setHasOptions] = useState(initial.variants.length > 0);
  const [colorsText, setColorsText] = useState('');
  const [sizesText, setSizesText] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const cats = useApi<Cat[]>('/admin/categories');
  const set = <K extends keyof ProductDraft>(k: K, v: ProductDraft[K]) => setD((p) => ({ ...p, [k]: v }));

  const roots = cats.data?.filter((c) => !c.parentId) ?? [];
  const kids = (pid: string) => cats.data?.filter((c) => c.parentId === pid) ?? [];

  const setVariant = (i: number, patch: Partial<VariantDraft>) => setD((p) => ({ ...p, variants: p.variants.map((v, k) => (k === i ? { ...v, ...patch } : v)) }));
  const removeVariant = (i: number) => setD((p) => ({ ...p, variants: p.variants.filter((_, k) => k !== i) }));
  const blankVariant = (): VariantDraft => ({ color: '', colorHex: '', size: '', price: '', stock: '1', imagePublicId: '', isActive: true });

  function generate() {
    const colors = splitList(colorsText);
    const sizes = splitList(sizesText);
    if (!colors.length && !sizes.length) { toast('اكتب الألوان أو الأحجام أولاً (افصل بينها بفاصلة)', 'bad'); return; }
    const combos: { color: string; size: string }[] = [];
    for (const c of colors.length ? colors : ['']) for (const s of sizes.length ? sizes : ['']) combos.push({ color: c, size: s });
    const have = new Set(d.variants.map(keyOf));
    const added = combos.filter((c) => !have.has(keyOf(c)));
    if (d.variants.length + added.length > 60) { toast('الحد الأقصى 60 خيارًا', 'bad'); return; }
    setD((p) => ({ ...p, variants: [...p.variants, ...added.map((c) => ({ ...blankVariant(), ...c, colorHex: hexFor(c.color) }))] }));
    setColorsText(''); setSizesText('');
    toast(added.length ? `أُضيف ${added.length} خيار — حدّد الكمية لكل واحد` : 'هذه الخيارات موجودة مسبقًا');
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    const price = Number(d.price);
    const compare = d.compareAtPrice.trim() === '' ? null : Number(d.compareAtPrice);
    if (d.name.trim().length < 2) next.name = 'اسم المنتج مطلوب';
    if (d.price.trim() === '' || !Number.isInteger(price) || price < 0) next.price = 'أدخل سعرًا صحيحًا (بدون فاصلة)';
    if (compare !== null && (!Number.isInteger(compare) || compare <= price)) next.compareAtPrice = 'يجب أن يكون أكبر من السعر الحالي';
    if (!hasOptions && (!Number.isInteger(Number(d.stock)) || Number(d.stock) < 0)) next.stock = 'كمية غير صحيحة';
    if (hasOptions) {
      if (d.variants.length === 0) next.variants = 'أضف خيارًا واحدًا على الأقل، أو أوقف الألوان والأحجام';
      else if (d.variants.some((v) => !v.color.trim() && !v.size.trim())) next.variants = 'كل خيار يحتاج لونًا أو حجمًا';
      else if (new Set(d.variants.map(keyOf)).size !== d.variants.length) next.variants = 'يوجد خياران متطابقان (نفس اللون ونفس الحجم)';
      else if (d.variants.some((v) => !Number.isInteger(Number(v.stock)) || Number(v.stock) < 0 || v.stock.trim() === '')) next.variants = 'الكمية غير صحيحة في أحد الخيارات';
      else if (d.variants.some((v) => v.price.trim() !== '' && (!Number.isInteger(Number(v.price)) || Number(v.price) < 0))) next.variants = 'سعر غير صحيح في أحد الخيارات';
    }
    setErrors(next);
    if (Object.keys(next).length) { toast(next.variants ?? 'راجع الحقول المظللة', 'bad'); return; }

    setBusy(true);
    try {
      const body = {
        name: d.name, description: d.description, price, compareAtPrice: compare, stock: hasOptions ? 0 : Number(d.stock), trackStock: d.trackStock,
        categoryId: d.categoryId || null, sku: d.sku, brand: d.brand, isActive: d.isActive, isFeatured: d.isFeatured, images: d.images,
        variants: hasOptions
          ? d.variants.map((v) => ({
              id: v.id, color: v.color.trim(), colorHex: v.colorHex, size: v.size.trim(), sku: '',
              price: v.price.trim() === '' ? null : Number(v.price), stock: Number(v.stock),
              imagePublicId: v.imagePublicId || null, isActive: v.isActive,
            }))
          : [],
      };
      if (id) await api(`/admin/products/${id}`, { method: 'PUT', body });
      else await api('/admin/products', { method: 'POST', body });
      toast(id ? 'تم حفظ التعديلات' : 'تمت إضافة المنتج');
      router.push('/admin/products');
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 422 && err.details && typeof err.details === 'object') {
        const fe = err.details as Record<string, string[]>;
        setErrors(Object.fromEntries(Object.entries(fe).map(([k, v]) => [k, v[0]])));
      }
      toast(errorMessage(err), 'bad');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="two-col" noValidate>
      <div style={{ display: 'grid', gap: '1.2rem', alignContent: 'start' }}>
        <section className="card-a">
          <div className="form-grid">
            <Field label="اسم المنتج *" error={errors.name} full><input className="input" value={d.name} maxLength={160} onChange={(e) => set('name', e.target.value)} aria-invalid={!!errors.name} /></Field>
            <Field label="الوصف" full hint="يظهر في صفحة المنتج — اذكر المقاسات والمادة وطريقة الاستعمال"><textarea className="textarea" rows={6} maxLength={5000} value={d.description} onChange={(e) => set('description', e.target.value)} /></Field>
            <Field label="العلامة التجارية"><input className="input" value={d.brand} maxLength={80} onChange={(e) => set('brand', e.target.value)} /></Field>
            <Field label="رمز المنتج (SKU)"><input className="input" dir="ltr" value={d.sku} maxLength={60} onChange={(e) => set('sku', e.target.value)} /></Field>
          </div>
        </section>
        <section className="card-a">
          <div className="card-head"><h2>الصور</h2></div>
          <ImageUploader folder="products" value={d.images} onChange={(v) => set('images', v)} max={8} />
        </section>

        <section className="card-a" aria-labelledby="opt-title">
          <div className="card-head">
            <h2 id="opt-title">الألوان والأحجام</h2>
            <div className="row"><Switch checked={hasOptions} onChange={setHasOptions} label="للمنتج ألوان أو أحجام" /><span>للمنتج ألوان أو أحجام</span></div>
          </div>
          {!hasOptions ? (
            <p className="muted">فعّل الخيار إن كان المنتج يُباع بعدة ألوان أو أحجام (مثل: موكا بألوان وسعات مختلفة). لكل خيار كمية خاصة، وسعر خاص اختياريًا.</p>
          ) : (
            <div className="stack" style={{ ['--gap' as string]: '1rem' }}>
              <div className="hint-box">
                أسرع طريقة: اكتب الألوان والأحجام ثم «إنشاء الخيارات» ليُنشأ كل تركيب تلقائيًا، ثم حدّد الكمية لكل خيار.
              </div>
              <div className="form-grid">
                <Field label="الألوان" hint="افصل بينها بفاصلة: أخضر، بنفسجي، رمادي"><input className="input" value={colorsText} onChange={(e) => setColorsText(e.target.value)} /></Field>
                <Field label="الأحجام" hint="مثال: 3 أكواب، 6 أكواب"><input className="input" value={sizesText} onChange={(e) => setSizesText(e.target.value)} /></Field>
              </div>
              <div className="row wrap">
                <button type="button" className="btn btn-soft btn-sm" onClick={generate}><PlusIcon width={15} height={15} /> إنشاء الخيارات</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setD((p) => ({ ...p, variants: [...p.variants, blankVariant()] }))}>إضافة خيار يدويًا</button>
              </div>
              {errors.variants && <div className="notice bad" role="alert">{errors.variants}</div>}
              {d.variants.map((v, i) => (
                <div className="variant-row" key={v.id ?? `n${i}`} style={{ opacity: v.isActive ? 1 : 0.6 }}>
                  <Field label="اللون">
                    <div className="color-pick">
                      <input type="color" aria-label="لون العينة" value={v.colorHex || '#cccccc'} onChange={(e) => setVariant(i, { colorHex: e.target.value })} style={{ opacity: v.colorHex ? 1 : 0.35 }} />
                      <input className="input" value={v.color} maxLength={40} onChange={(e) => setVariant(i, { color: e.target.value })} onBlur={() => !v.colorHex && hexFor(v.color) && setVariant(i, { colorHex: hexFor(v.color) })} />
                    </div>
                  </Field>
                  <Field label="الحجم"><input className="input" value={v.size} maxLength={40} onChange={(e) => setVariant(i, { size: e.target.value })} /></Field>
                  <Field label="سعر خاص (اختياري)"><input className="input" dir="ltr" inputMode="numeric" placeholder="نفس السعر" value={v.price} onChange={(e) => setVariant(i, { price: e.target.value.replace(/[^\d]/g, '') })} /></Field>
                  <Field label="الكمية"><input className="input" dir="ltr" inputMode="numeric" value={v.stock} onChange={(e) => setVariant(i, { stock: e.target.value.replace(/[^\d]/g, '') })} /></Field>
                  <button type="button" className="icon-btn" aria-label="حذف الخيار" onClick={() => removeVariant(i)}><TrashIcon /></button>
                  <div className="wide">
                    {d.images.length > 0 && (
                      <label className="row" style={{ gap: '.5rem' }}>
                        <span className="muted" style={{ fontSize: '.82rem' }}>صورة هذا الخيار</span>
                        <select className="select" style={{ width: 160, minHeight: 38 }} value={v.imagePublicId} onChange={(e) => setVariant(i, { imagePublicId: e.target.value })}>
                          <option value="">الافتراضية</option>
                          {d.images.map((img, k) => <option key={img.publicId} value={img.publicId}>صورة {k + 1}</option>)}
                        </select>
                      </label>
                    )}
                    <label className="row" style={{ gap: '.5rem' }}><Switch checked={v.isActive} onChange={(x) => setVariant(i, { isActive: x })} label="الخيار ظاهر" /><span style={{ fontSize: '.85rem' }}>ظاهر للزبائن</span></label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div style={{ display: 'grid', gap: '1.2rem', alignContent: 'start' }}>
        <section className="card-a">
          <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
            <Field label={hasOptions ? 'السعر الأساسي (دج) *' : 'السعر (دج) *'} error={errors.price} hint={hasOptions ? 'يُطبَّق على كل خيار لم تحدد له سعرًا خاصًا' : undefined}><input className="input" inputMode="numeric" dir="ltr" value={d.price} onChange={(e) => set('price', e.target.value.replace(/[^\d]/g, ''))} aria-invalid={!!errors.price} /></Field>
            <Field label="السعر قبل التخفيض (اختياري)" error={errors.compareAtPrice} hint="يظهر مشطوبًا مع نسبة التخفيض"><input className="input" inputMode="numeric" dir="ltr" value={d.compareAtPrice} onChange={(e) => set('compareAtPrice', e.target.value.replace(/[^\d]/g, ''))} aria-invalid={!!errors.compareAtPrice} /></Field>
            <Field label="القسم">
              <select className="select" value={d.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
                <option value="">بدون قسم</option>
                {roots.map((r) => (
                  <optgroup key={r.id} label={r.name}>
                    <option value={r.id}>{r.name}</option>
                    {kids(r.id).map((k) => <option key={k.id} value={k.id}>— {k.name}</option>)}
                  </optgroup>
                ))}
              </select>
            </Field>
          </div>
        </section>
        <section className="card-a stack" style={{ ['--gap' as string]: '1rem' }}>
          <div className="row"><Switch checked={d.trackStock} onChange={(v) => set('trackStock', v)} label="تتبّع المخزون" /><span className="grow">تتبّع المخزون</span></div>
          {d.trackStock && !hasOptions && <Field label="الكمية المتوفرة" error={errors.stock}><input className="input" inputMode="numeric" dir="ltr" value={d.stock} onChange={(e) => set('stock', e.target.value.replace(/[^\d]/g, ''))} /></Field>}
          {d.trackStock && hasOptions && <p className="muted" style={{ fontSize: '.88rem' }}>الكمية تُحدَّد لكل لون/حجم في قسم «الألوان والأحجام».</p>}
          <div className="row"><Switch checked={d.isActive} onChange={(v) => set('isActive', v)} label="ظاهر في المتجر" /><span className="grow">ظاهر في المتجر</span></div>
          <div className="row"><Switch checked={d.isFeatured} onChange={(v) => set('isFeatured', v)} label="منتج مميز" /><span className="grow">منتج مميز (يظهر في الرئيسية)</span></div>
        </section>
        <div className="row">
          <button className="btn grow" disabled={busy} type="submit">{busy ? <span className="spinner" /> : id ? 'حفظ التعديلات' : 'نشر المنتج'}</button>
          <Link href="/admin/products" className="btn btn-ghost">إلغاء</Link>
        </div>
      </div>
    </form>
  );
}
