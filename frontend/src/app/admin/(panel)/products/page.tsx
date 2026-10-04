'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api, errorMessage } from '@/lib/client-api';
import { formatNumber } from '@/lib/format';
import { cld } from '@/lib/image';
import { toast } from '@/lib/toast';
import { BoxIcon, EditIcon, PlusIcon } from '@/components/icons';
import { ConfirmButton, ErrorBox, PageLoading, Pagination, Switch, useApi, useDebounced } from '@/components/admin/ui';

interface Product { id: string; name: string; slug: string; sku: string; price: number; compareAtPrice: number | null; stock: number; trackStock: boolean; isActive: boolean; isFeatured: boolean; soldCount: number; categoryName: string | null; image: string | null }
interface Res { items: Product[]; total: number; page: number; pages: number }
interface Cat { id: string; name: string; parentId: string | null }

export default function ProductsPage() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const qs = new URLSearchParams({ status, page: String(page), limit: '20' });
  if (dq.trim()) qs.set('q', dq.trim());
  if (categoryId) qs.set('categoryId', categoryId);
  const { data, setData, error, loading, reload } = useApi<Res>(`/admin/products?${qs}`);
  const cats = useApi<Cat[]>('/admin/categories');

  async function flag(p: Product, patch: { isActive?: boolean; isFeatured?: boolean }) {
    const before = data;
    setData(data && { ...data, items: data.items.map((x) => (x.id === p.id ? { ...x, ...patch } : x)) });
    try {
      await api(`/admin/products/${p.id}`, { method: 'PATCH', body: patch });
    } catch (e) {
      setData(before);
      toast(errorMessage(e), 'bad');
    }
  }
  async function remove(p: Product) {
    try {
      await api(`/admin/products/${p.id}`, { method: 'DELETE' });
      toast('تم حذف المنتج');
      reload();
    } catch (e) {
      toast(errorMessage(e), 'bad');
    }
  }

  return (
    <div className="card-a">
      <div className="card-head">
        <div className="row wrap">
          <input className="input search-a" placeholder="ابحث بالاسم أو الرمز…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="بحث" />
          <select className="select" style={{ width: 170 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="الحالة">
            <option value="all">كل الحالات</option><option value="active">ظاهر</option><option value="hidden">مخفي</option><option value="out_of_stock">نفد المخزون</option>
          </select>
          <select className="select" style={{ width: 190 }} value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }} aria-label="القسم">
            <option value="">كل الأقسام</option>
            {cats.data?.map((c) => <option key={c.id} value={c.id}>{c.parentId ? '— ' : ''}{c.name}</option>)}
          </select>
        </div>
        <Link href="/admin/products/new" className="btn btn-sm"><PlusIcon width={16} height={16} /> منتج جديد</Link>
      </div>
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data ? <PageLoading /> : data && (
        data.items.length === 0 ? (
          <div className="empty"><h3>لا توجد منتجات</h3><p style={{ marginBlockEnd: '1rem' }}>ابدأ بإضافة أول منتج لمتجرك.</p><Link href="/admin/products/new" className="btn">إضافة منتج</Link></div>
        ) : (
          <div className="table-wrap"><table className="t"><thead><tr><th>المنتج</th><th>القسم</th><th>السعر</th><th>المخزون</th><th>ظاهر</th><th>مميز</th><th /></tr></thead><tbody>
            {data.items.map((p) => (
              <tr key={p.id}>
                <td><div className="row"><div className="thumb-s">{p.image ? <img src={cld(p.image, { width: 46, ratio: '1:1' })} alt="" width={46} height={46} loading="lazy" /> : <div className="noimg"><BoxIcon /></div>}</div>
                  <div><b>{p.name}</b>{p.sku && <><br /><small className="muted num">{p.sku}</small></>}</div></div></td>
                <td>{p.categoryName ?? <span className="muted">—</span>}</td>
                <td><span className="num">{formatNumber(p.price)}</span> دج{p.compareAtPrice && <><br /><small className="muted" style={{ textDecoration: 'line-through' }}><span className="num">{formatNumber(p.compareAtPrice)}</span></small></>}</td>
                <td>{p.trackStock ? <span className={`pill ${p.stock === 0 ? 'pill-bad' : p.stock <= 5 ? 'pill-warn' : 'pill-ok'}`}><span className="num">{p.stock}</span></span> : <span className="muted">غير محدود</span>}</td>
                <td><Switch checked={p.isActive} label="إظهار المنتج" onChange={(v) => void flag(p, { isActive: v })} /></td>
                <td><Switch checked={p.isFeatured} label="منتج مميز" onChange={(v) => void flag(p, { isFeatured: v })} /></td>
                <td><div className="row" style={{ justifyContent: 'flex-end' }}>
                  <Link href={`/admin/products/${p.id}`} className="btn btn-sm btn-soft"><EditIcon width={15} height={15} /> تعديل</Link>
                  <ConfirmButton onConfirm={() => remove(p)}>حذف</ConfirmButton>
                </div></td>
              </tr>
            ))}</tbody></table></div>
        )
      )}
      {data && <Pagination page={data.page} pages={data.pages} onPage={setPage} />}
    </div>
  );
}
