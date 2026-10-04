import { CLOUD_NAME } from './site';

export type Fit = 'cover' | 'contain';

export interface CldOptions {
  width: number;
  /** "1:1", "4:5", "16:9" … used only with fit="cover". */
  ratio?: string;
  fit?: Fit;
}

/**
 * The ONLY place that builds Cloudinary delivery URLs.
 * f_auto → best format per browser (AVIF/WebP), q_auto → smart compression, plus a width cap:
 * a 400px card image weighs ~10 KB instead of the multi-hundred-KB original. This is what keeps
 * the free plan's bandwidth credits from running out (the previous project's problem).
 */
export function cld(publicId: string, { width, ratio = '1:1', fit = 'cover' }: CldOptions): string {
  const w = Math.max(16, Math.min(Math.round(width), 2400));
  const transform = fit === 'cover' ? `f_auto,q_auto,c_fill,g_auto,ar_${ratio},w_${w}` : `f_auto,q_auto,c_limit,w_${w}`;
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transform}/${publicId}`;
}
