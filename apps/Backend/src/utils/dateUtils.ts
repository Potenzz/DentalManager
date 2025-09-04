
/**
 * Convert any OCR string-like value into a safe string.
 */
export function toStr(val: string | number | null | undefined): string {
  if (val == null) return "";
  return String(val).trim();
}
/**
 * Convert OCR date strings like "070825" (MMDDYY) into a JS Date object.
 * Example: "070825" → 2025-08-07.
 */
export function convertOCRDate(input: string | number | null | undefined): Date {
  const raw = toStr(input);

  if (!/^\d{6}$/.test(raw)) {
    throw new Error(`Invalid OCR date format: ${raw}`);
  }

  const month = parseInt(raw.slice(0, 2), 10) - 1;
  const day = parseInt(raw.slice(2, 4), 10);
  const year2 = parseInt(raw.slice(4, 6), 10);
  const year = year2 < 50 ? 2000 + year2 : 1900 + year2;

  return new Date(year, month, day);
}
