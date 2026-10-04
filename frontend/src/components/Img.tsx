import { cld, type Fit } from '@/lib/image';

interface Props {
  id: string;
  alt: string;
  /** Rendered CSS width in px (used to build a responsive srcset, 1x/1.5x/2x). */
  width: number;
  ratio?: string;
  fit?: Fit;
  sizes?: string;
  priority?: boolean;
  className?: string;
}

/** Every product/category/banner picture goes through here: Cloudinary f_auto,q_auto at the right size. */
export function Img({ id, alt, width, ratio = '4:5', fit = 'cover', sizes, priority = false, className }: Props) {
  const [rw, rh] = ratio.split(':').map(Number);
  const srcSet = [1, 1.5, 2].map((k) => `${cld(id, { width: width * k, ratio, fit })} ${Math.round(width * k)}w`).join(', ');
  return (
    <img
      className={className}
      src={cld(id, { width, ratio, fit })}
      srcSet={srcSet}
      sizes={sizes ?? `${width}px`}
      width={width}
      height={fit === 'cover' ? Math.round((width * rh) / rw) : undefined}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
    />
  );
}
