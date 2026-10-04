'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { api, ApiClientError, errorMessage } from '@/lib/client-api';
import { STATUS_LABEL, STATUS_TONE } from '@/lib/format';

/** Tiny data hook: aborts on unmount, redirects on expired session, exposes reload(). */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(path !== null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (path === null) return;
    const ctl = new AbortController();
    setLoading(true);
    api<T>(path, { signal: ctl.signal })
      .then((d) => { setData(d); setError(''); })
      .catch((e: unknown) => {
        if ((e as Error).name === 'AbortError') return;
        if (e instanceof ApiClientError && e.status === 401) { window.location.href = '/admin/login'; return; }
        if (e instanceof ApiClientError && e.code === 'password_change_required') { window.location.href = '/admin/account'; return; }
        setError(errorMessage(e));
      })
      .finally(() => { if (!ctl.signal.aborted) setLoading(false); });
    return () => ctl.abort();
  }, [path, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, setData, error, loading, reload };
}

export function useDebounced<T>(value: T, ms = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

export function Spinner({ dark = true }: { dark?: boolean }) {
  return <span className={`spinner ${dark ? 'dark' : ''}`} role="status" aria-label="جارٍ التحميل" />;
}

export function PageLoading() {
  return <div className="card-a" style={{ display: 'grid', placeItems: 'center', minHeight: 220 }}><Spinner /></div>;
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="notice bad" role="alert" style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
      <span>{message}</span>
      {onRetry && <button className="btn btn-sm btn-ghost" onClick={onRetry}>إعادة المحاولة</button>}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  return <span className={`pill pill-${STATUS_TONE[status] ?? 'mute'}`}>{STATUS_LABEL[status] ?? status}</span>;
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <label className="switch" title={label}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
      <i />
    </label>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    ref.current?.querySelector<HTMLElement>('input,select,textarea,button')?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

/** Two-step delete: first click arms the button, second click confirms. No accidental deletions. */
export function ConfirmButton({ onConfirm, children, label = 'تأكيد الحذف', className = 'btn btn-sm btn-ghost' }: { onConfirm: () => void | Promise<void>; children: ReactNode; label?: string; className?: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 3500); return () => clearTimeout(t); }, [armed]);
  return (
    <button type="button" className={armed ? 'btn btn-sm btn-danger' : className} onClick={() => (armed ? (setArmed(false), void onConfirm()) : setArmed(true))}>
      {armed ? label : children}
    </button>
  );
}

export function Pagination({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="row" style={{ justifyContent: 'center', marginBlockStart: '1rem' }}>
      <button className="btn btn-sm btn-ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>السابق</button>
      <span className="muted">صفحة <span className="num">{page}</span> من <span className="num">{pages}</span></span>
      <button className="btn btn-sm btn-ghost" disabled={page >= pages} onClick={() => onPage(page + 1)}>التالي</button>
    </div>
  );
}

export function Field({ label, hint, error, full, children }: { label: string; hint?: string; error?: string; full?: boolean; children: ReactNode }) {
  return (
    <div className={`field ${full ? 'full' : ''}`}>
      <label>{label}</label>
      {children}
      {hint && !error && <span className="hint">{hint}</span>}
      {error && <span className="err">{error}</span>}
    </div>
  );
}
