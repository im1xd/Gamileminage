'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, errorMessage } from '@/lib/client-api';
import { toast } from '@/lib/toast';
import { ErrorBox, PageLoading, Switch, useApi } from '@/components/admin/ui';

interface Rate { wilayaCode: number; wilayaName: string; price: number | null; isActive: boolean }
interface Row { wilayaCode: number; wilayaName: string; price: string; isActive: boolean }

const toRow = (r: Rate): Row => ({ wilayaCode: r.wilayaCode, wilayaName: r.wilayaName, price: r.price === null ? '' : String(r.price), isActive: r.isActive });

export default function ShippingPage() {
  const { data, error, loading, reload } = useApi<Rate[]>('/admin/shipping');
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState('');
  const [all, setAll] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setRows(data.map(toRow)); }, [data]);

  const dirty = useMemo(() => {
    if (!data) return 0;
    const orig = new Map(data.map((r) => [r.wilayaCode, toRow(r)]));
    return rows.filter((r) => { const o = orig.get(r.wilayaCode); return !o || o.price !== r.price || o.isActive !== r.isActive; }).length;
  }, [rows, data]);

  if (loading && !data) return <PageLoading />;
  if (error || !data) return <ErrorBox message={error || 'تعذّر التحميل'} onRetry={reload} />;
  const update = (code: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.wilayaCode === code ? { ...r, ...patch } : r)));
  const shown = rows.filter((r) => !q.trim() || r.wilayaName.includes(q.trim()) || String(r.wilayaCode) === q.trim());
  const missing = rows.filter((r) => r.isActive && r.price === '').length;

  async function save() {
    setBusy(true);
    try {
      await api('/admin/shipping', { method: 'PUT', body: { rates: rows.map((r) => ({ wilayaCode: r.wilayaCode, price: r.price === '' ? null : Number(r.price), isActive: r.isActive })) } });
      toast('تم حفظ أسعار التوصيل');
      reload();
    } catch (e) {
      toast(errorMessage(e), 'bad');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card-a">
      <div className="card-head">
        <div className="row wrap">
          <input className="input search-a" placeholder="ابحث عن ولاية…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="بحث" />
          <input className="input" style={{ width: 150 }} dir="ltr" inputMode="numeric" placeholder="سعر موحّد" value={all} onChange={(e) => setAll(e.target.value.replace(/[^\d]/g, ''))} aria-label="سعر موحد" />
          <button className="btn btn-sm btn-soft" disabled={all === ''} onClick={() => { setRows((rs) => rs.map((r) => ({ ...r, price: all }))); toast('طُبّق على كل الولايات — لا تنسَ الحفظ'); }}>تطبيق على الكل</button>
        </div>
        <button className="btn" disabled={busy || dirty === 0} onClick={save}>{busy ? <span className="spinner" /> : `حفظ${dirty ? ` (${dirty})` : ''}`}</button>
      </div>
      {missing > 0 && <div className="hint-box" style={{ marginBlockEnd: '1rem' }}>{missing} ولاية بلا سعر: ستُقبل الطلبات منها ويظهر للزبون «يُحدَّد عند التأكيد» — ثم تحدد السعر من صفحة الطلب. اكتب 0 للتوصيل المجاني.</div>}
      <div className="table-wrap"><table className="t"><thead><tr><th>الولاية</th><th>سعر التوصيل (دج)</th><th>التوصيل متاح</th></tr></thead><tbody>
        {shown.map((r) => (
          <tr key={r.wilayaCode} style={{ opacity: r.isActive ? 1 : 0.55 }}>
            <td><span className="num muted">{String(r.wilayaCode).padStart(2, '0')}</span> &nbsp;<b>{r.wilayaName}</b></td>
            <td><input className="input" style={{ width: 150 }} dir="ltr" inputMode="numeric" placeholder="غير محدد" value={r.price} onChange={(e) => update(r.wilayaCode, { price: e.target.value.replace(/[^\d]/g, '') })} aria-label={`سعر ${r.wilayaName}`} /></td>
            <td><Switch checked={r.isActive} onChange={(v) => update(r.wilayaCode, { isActive: v })} label={`التوصيل إلى ${r.wilayaName}`} /></td>
          </tr>
        ))}</tbody></table></div>
    </div>
  );
}
