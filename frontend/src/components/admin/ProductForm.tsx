'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { api, ApiClientError, errorMessage } from '@/lib/client-api';
import { toast } from '@/lib/toast';
import { Field, Switch, useApi } from './ui';
import { ImageUploader, type ImageValue } from './ImageUploader';

export interface ProductDraft {
  name: string; description: string; price: string; compareAtPrice: string; stock: string; trackStock: boolean;
  categoryId: string; sku: string; brand: string; isActive: boolean; isFeatured: boolean; images: ImageValue[];
}
export const EMPTY_PRODUCT: ProductDraft = { name: '', description: '', price: '', compareAtPrice: '', stock: '1', trackStock: true, categoryId: '', sku: '', brand: '', isActive: true, isFeatured: false, images: [] };

interface Cat { id: string; name: string; parentId: string | null }

export function ProductForm({ id, initial }: { id?: string; initial: ProductDraft }) {
  const router = useRouter();
  const [d, setD] = useState<ProductDraft>(initial);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const cats = useApi<Cat[]>('/admin/categories');
  const set = <K extends keyof ProductDraft>(k: K, v: ProductDraft[K]) => setD((p) => ({ ...p, [k]: v }));

  const roots = cats.data?.filter((c) => !c.parentId) ?? [];
  const kids = (pid: string) => cats.data?.filter((c) => c.parentId === pid) ?? [];

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    const price = Number(d.price);
    const compare = d.compareAtPrice.trim() === '' ? null : Number(d.compareAtPrice);
    if (d.name.trim().length < 2) next.name = 'اسم المنتج مطلوب';
    if (d.price.trim() === '' || !Number.isInteger(price) || price < 0) next.price = 'أدخل سعرًا صحيحًا (بدون فاصلة)';
    if (compare !== null && (!Number.isInteger(compare) || compare <= price)) next.compareAtPrice = 'يجب أن يكون أكبر من السعر الحالي';
    if (!Number.isInteger(Number(d.stock)) || Number(d.stock) < 0) next.stock = 'كمية غير صحيحة';
    setErrors(next);
    if (Object.keys(next).length) { toast('راجع الحقول المظللة', 'bad'); return; }

    setBusy(true);
    try {
      const body = {
        name: d.name, description: d.description, price, compareAtPrice: compare, stock: Number(d.stock), trackStock: d.trackStock,
        categoryId: d.categoryId || null, sku: d.sku, brand: d.brand, isActive: d.isActive, isFeatured: d.isFeatured, images: d.images,
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
      </div>

      <div style={{ display: 'grid', gap: '1.2rem', alignContent: 'start' }}>
        <section className="card-a">
          <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
            <Field label="السعر (دج) *" error={errors.price}><input className="input" inputMode="numeric" dir="ltr" value={d.price} onChange={(e) => set('price', e.target.value.replace(/[^\d]/g, ''))} aria-invalid={!!errors.price} /></Field>
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
          {d.trackStock && <Field label="الكمية المتوفرة" error={errors.stock}><input className="input" inputMode="numeric" dir="ltr" value={d.stock} onChange={(e) => set('stock', e.target.value.replace(/[^\d]/g, ''))} /></Field>}
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
