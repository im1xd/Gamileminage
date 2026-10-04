'use client';

import { useEffect, useState } from 'react';

type Tone = 'ok' | 'bad' | 'info';
interface ToastItem { id: number; message: string; tone: Tone }

let counter = 0;
const listeners = new Set<(t: ToastItem) => void>();

/** Fire-and-forget notification usable from anywhere on the client. */
export function toast(message: string, tone: Tone = 'ok'): void {
  const item = { id: ++counter, message, tone };
  listeners.forEach((l) => l(item));
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    const listener = (t: ToastItem) => {
      setItems((prev) => [...prev.slice(-2), t]);
      window.setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== t.id)), 4200);
    };
    listeners.add(listener);
    return () => void listeners.delete(listener);
  }, []);
  return (
    <div className="toaster" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone}`}>{t.message}</div>
      ))}
    </div>
  );
}
