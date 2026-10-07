import type { Variant } from './types';

type Option = Pick<Variant, 'color' | 'size' | 'inStock'>;

export const findVariant = <T extends Option>(variants: T[], color: string, size: string): T | null =>
  variants.find((v) => v.color === color && v.size === size) ?? null;

/** The option to preselect: the first one that is in stock (else simply the first). */
export const firstChoice = <T extends Option>(variants: T[]): T | null => variants.find((v) => v.inStock) ?? variants[0] ?? null;

/**
 * After the buyer picks a colour, keep their size if that colour comes in it;
 * otherwise move to the first size available in that colour (in stock preferred).
 */
export function settleSize(variants: Option[], color: string, size: string): string {
  if (findVariant(variants, color, size)) return size;
  return variants.find((v) => v.color === color && v.inStock)?.size ?? variants.find((v) => v.color === color)?.size ?? '';
}
