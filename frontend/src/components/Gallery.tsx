'use client';

import { Img } from './Img';
import { BoxIcon } from './icons';

export interface GalleryImage { publicId: string; alt: string }

/** Controlled gallery: the parent owns the selected index so picking a colour can jump to that colour's photo. */
export function Gallery({ images, name, index, onIndex }: { images: GalleryImage[]; name: string; index: number; onIndex: (i: number) => void }) {
  if (!images.length) return <div className="gallery"><div className="gallery-main"><div className="noimg"><BoxIcon /></div></div></div>;
  const current = images[Math.min(index, images.length - 1)];
  return (
    <div className="gallery">
      <div className="gallery-main">
        <Img key={current.publicId} id={current.publicId} alt={current.alt || name} width={640} ratio="1:1" fit="contain" sizes="(max-width: 860px) 94vw, 560px" priority />
      </div>
      {images.length > 1 && (
        <div className="gallery-thumbs" role="tablist" aria-label="صور المنتج">
          {images.map((img, i) => (
            <button key={img.publicId} type="button" className="thumb" role="tab" aria-selected={i === index} aria-current={i === index} aria-label={`الصورة ${i + 1}`} onClick={() => onIndex(i)}>
              <Img id={img.publicId} alt="" width={74} ratio="1:1" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
