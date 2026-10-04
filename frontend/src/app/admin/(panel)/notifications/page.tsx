'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/client-api';
import { formatDate, relativeTime } from '@/lib/format';
import { ErrorBox, PageLoading, Pagination, useApi } from '@/components/admin/ui';

interface N { id: string; title: string; body: string; link: string; isRead: boolean; createdAt: string }
interface Res { items: N[]; total: number; page: number; limit: number }

export default function NotificationsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useApi<Res>(`/admin/notifications?page=${page}&limit=20`);
  if (loading && !data) return <PageLoading />;
  if (error || !data) return <ErrorBox message={error || 'تعذّر التحميل'} onRetry={reload} />;
  const open = async (n: N) => {
    if (!n.isRead) await api('/admin/notifications/read', { method: 'POST', body: { id: n.id } }).catch(() => undefined);
    if (n.link) router.push(n.link); else reload();
  };
  return (
    <div className="card-a">
      <div className="card-head"><p className="muted">كل الطلبات الجديدة وأحداث المتجر تصل هنا فور حدوثها.</p>
        <button className="btn btn-sm btn-soft" onClick={async () => { await api('/admin/notifications/read', { method: 'POST', body: {} }); reload(); }}>تحديد الكل كمقروء</button></div>
      {data.items.length === 0 ? <p className="muted center" style={{ padding: '2rem' }}>لا توجد إشعارات بعد.</p> : (
        <div style={{ margin: '0 -1.2rem -1.1rem' }}>
          {data.items.map((n) => (
            <button key={n.id} className={`notif ${n.isRead ? '' : 'unread'}`} onClick={() => void open(n)}>
              <b>{n.title}</b><span>{n.body}</span><br /><span>{relativeTime(n.createdAt)} • {formatDate(n.createdAt)}</span>
            </button>
          ))}
        </div>
      )}
      <Pagination page={data.page} pages={Math.max(1, Math.ceil(data.total / data.limit))} onPage={setPage} />
    </div>
  );
}
