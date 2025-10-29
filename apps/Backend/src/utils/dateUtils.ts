
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

/**
 * Normalize a DOB value to "YYYY-MM-DD" string expected by the Python agent.
 * - If dob is already "YYYY-MM-DD" string, returns it.
 * - If dob is an ISO datetime string or Date, returns YYYY-MM-DD derived from UTC parts (no timezone shifts).
 * - Returns null for invalid values.
 */
export function formatDobForAgent(dob: Date | string | null | undefined): string | null {
  if (!dob) return null;

  // If it's a string in exact YYYY-MM-DD format, return as-is (most ideal).
  if (typeof dob === "string") {
    const simpleDateMatch = /^\d{4}-\d{2}-\d{2}$/.test(dob);
    if (simpleDateMatch) return dob;

    // Otherwise try parsing as a Date/ISO string and use UTC parts
    const parsed = new Date(dob);
    if (isNaN(parsed.getTime())) return null;
    const y = parsed.getUTCFullYear();
    const m = String(parsed.getUTCMonth() + 1).padStart(2, "0");
    const d = String(parsed.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // If it's a Date object, use UTC getters to avoid timezone shifts
  if (dob instanceof Date) {
    if (isNaN(dob.getTime())) return null;
    const y = dob.getUTCFullYear();
    const m = String(dob.getUTCMonth() + 1).padStart(2, "0");
    const d = String(dob.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  return null;
}
