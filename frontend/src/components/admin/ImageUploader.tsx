'use client';

import { useRef, useState } from 'react';
import { cld } from '@/lib/image';
import { uploadImage, type UploadFolder } from '@/lib/upload';
import { toast } from '@/lib/toast';
import { ImageIcon, TrashIcon } from '../icons';

export interface ImageValue { publicId: string; alt: string }

interface Props {
  folder: UploadFolder;
  value: ImageValue[];
  onChange: (next: ImageValue[]) => void;
  max?: number;
  ratio?: string;
}

const kb = (n: number) => `${Math.max(1, Math.round(n / 1024))} KB`;

/** Multi-image uploader: compresses in the browser (see lib/upload.ts), uploads straight to Cloudinary, supports re-ordering. */
export function ImageUploader({ folder, value, onChange, max = 8, ratio = '1:1' }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);

  async function pick(files: FileList | null) {
    if (!files?.length) return;
    const room = max - value.length;
    if (room <= 0) { toast(`الحد الأقصى ${max} صور`, 'bad'); return; }
    const list = Array.from(files).slice(0, room);
    let current = value;
    setBusy((b) => b + list.length);
    for (const file of list) {
      try {
        const up = await uploadImage(file, folder);
        current = [...current, { publicId: up.publicId, alt: '' }];
        onChange(current);
        const saved = Math.round((1 - up.uploadedBytes / up.originalBytes) * 100);
        if (saved > 5) toast(`تم ضغط الصورة: ${kb(up.originalBytes)} ← ${kb(up.uploadedBytes)} (وفّرت ${saved}%)`);
      } catch (error) {
        toast((error as Error).message, 'bad');
      } finally {
        setBusy((b) => b - 1);
      }
    }
    if (input.current) input.current.value = '';
  }

  const move = (i: number, d: -1 | 1) => {
    const next = [...value];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div>
      <div className="img-grid">
        {value.map((img, i) => (
          <div className={`img-item ${i === 0 ? 'main' : ''}`} key={img.publicId}>
            <img src={cld(img.publicId, { width: 160, ratio })} alt={img.alt || `صورة ${i + 1}`} width={160} height={160} />
            {i === 0 && <span className="main-tag">الرئيسية</span>}
            <div className="ctl">
              <button type="button" aria-label="حذف الصورة" onClick={() => onChange(value.filter((_, k) => k !== i))}><TrashIcon width={15} height={15} /></button>
              <span style={{ display: 'flex', gap: 2 }}>
                <button type="button" aria-label="تقديم" disabled={i === 0} onClick={() => move(i, -1)}>→</button>
                <button type="button" aria-label="تأخير" disabled={i === value.length - 1} onClick={() => move(i, 1)}>←</button>
              </span>
            </div>
          </div>
        ))}
        {Array.from({ length: busy }, (_, i) => <div className="drop" key={`b${i}`}><span className="spinner dark" /><span>جارٍ الرفع…</span></div>)}
        {value.length + busy < max && (
          <button type="button" className="drop" onClick={() => input.current?.click()}>
            <ImageIcon /><span>إضافة صور</span>
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple hidden onChange={(e) => void pick(e.target.files)} />
      <p className="muted" style={{ fontSize: '.82rem', marginBlockStart: '.6rem' }}>تُضغط الصور تلقائيًا قبل الرفع لتوفير المساحة. الصورة الأولى هي الرئيسية — رتّبها بالأسهم.</p>
    </div>
  );
}
