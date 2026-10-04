const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';
const EXT_ARABIC_INDIC = '۰۱۲۳۴۵۶۷۸۹';

/**
 * Normalises an Algerian mobile number to the national format 05XXXXXXXX / 06XXXXXXXX / 07XXXXXXXX.
 * Accepts spaces, dots, dashes, Arabic digits, +213 and 00213 prefixes. Returns null if invalid.
 */
export function normalizeDzPhone(input: string): string | null {
  let value = input
    .replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(EXT_ARABIC_INDIC.indexOf(d)))
    .replace(/[\s.\-()]/g, '');
  if (value.startsWith('+213')) value = '0' + value.slice(4);
  else if (value.startsWith('00213')) value = '0' + value.slice(5);
  else if (value.startsWith('213') && value.length === 12) value = '0' + value.slice(3);
  return /^0[567]\d{8}$/.test(value) ? value : null;
}
