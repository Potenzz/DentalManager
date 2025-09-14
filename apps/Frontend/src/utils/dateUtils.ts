/**
 * Parse a date string in yyyy-MM-dd format (assumed local) into a JS Date object.
 * No timezone conversion is applied. Returns a Date at midnight local time.
 */

export function parseLocalDate(input: string | Date): Date {
  if (input instanceof Date) {
    return new Date(input.getFullYear(), input.getMonth(), input.getDate());
  }

  if (typeof input === "string") {
    const dateString = input?.split("T")[0] ?? "";
    const parts = dateString.split("-");

    const [yearStr, monthStr, dayStr] = parts;

    // Validate all parts are defined and valid strings
    if (!yearStr || !monthStr || !dayStr) {
      throw new Error("Invalid date string format. Expected yyyy-MM-dd.");
    }

    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1; // JS Date months are 0-based
    const day = parseInt(dayStr, 10);

    if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
      throw new Error("Invalid numeric values in date string.");
    }

    return new Date(year, month, day);
  }
  throw new Error(
    "Unsupported input to parseLocalDate. Expected string or Date."
  );
}

/**
 * Format a JS Date object as a `yyyy-MM-dd` string (in local time).
 * Useful for saving date-only data without time component.
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear(); // ← local time
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`; // e.g. "2025-07-15"
}

/**
 * Get a Date object representing midnight UTC for a given local date.
 * Useful for comparing or storing dates consistently across timezones.
 */
export function toUTCDate(date: Date): Date {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
}

/**
 * Converts a stored UTC date string (e.g. from DB) into a Date object
 * and formats it as local yyyy-MM-dd string for UI use.
 */
export function formatUTCDateStringToLocal(dateStr: string): string {
  const localDate = parseLocalDate(dateStr); // will strip the time part
  return formatLocalDate(localDate); // e.g., "2025-07-15"
}

/**
 * Ensure any date (Date|string) is formatted to ISO string for consistent backend storage.
 * If it's already a string, pass through. If it's a Date, convert to ISO.
 */
export function normalizeToISOString(date: Date | string): string {
  const parsed = parseLocalDate(date);
  return parsed.toISOString(); // ensures it always starts from local midnight
}

/**
 * Formats a date string or Date object into a human-readable "DD Mon YYYY" string.
 * Examples: "22 Jul 2025"
 *
 * @param dateInput The date as a string (e.g., ISO, YYYY-MM-DD) or a Date object.
 * @returns A formatted date string.
 */
export const formatDateToHumanReadable = (
  dateInput?: string | Date
): string => {
  if (!dateInput) return "N/A";
  // Create a Date object from the input.
  // The Date constructor is quite flexible with various string formats.
  const date = new Date(dateInput);

  // Check if the date is valid. If new Date() fails to parse, it returns "Invalid Date".
  if (isNaN(date.getTime())) {
    console.error("Invalid date input provided:", dateInput);
    return "Invalid Date"; // Or handle this error in a way that suits your UI
  }

  // Use Intl.DateTimeFormat for locale-aware, human-readable formatting.
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit", // e.g., "01", "22"
    month: "short", // e.g., "Jan", "Jul"
    year: "numeric", // e.g., "2023", "2025"
  }).format(date);
};

/**
 * Convert any OCR numeric-ish value into a number.
 * Handles string | number | null | undefined gracefully.
 */
export function toNum(val: string | number | null | undefined): number {
  if (val == null || val === "") return 0;
  if (typeof val === "number") return val;
  const parsed = Number(val);
  return isNaN(parsed) ? 0 : parsed;
}

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
 * Format a Date or date string into "HH:mm" (24-hour) string.
 *
 * Options:
 * - By default, hours/minutes are taken in local time.
 * - Pass { asUTC: true } to format using UTC hours/minutes.
 *
 * Examples:
 *   formatLocalTime(new Date(2025, 6, 15, 9, 5))       → "09:05"
 *   formatLocalTime("2025-07-15")                      → "00:00"
 *   formatLocalTime("2025-07-15T14:30:00Z")            → "20:30" (in +06:00)
 *   formatLocalTime("2025-07-15T14:30:00Z", { asUTC:true }) → "14:30"
 */
export function formatLocalTime(
  d: Date | string | undefined,
  opts: { asUTC?: boolean } = {}
): string {
  if (!d) return "";

  const { asUTC = false } = opts;
  const pad2 = (n: number) => n.toString().padStart(2, "0");

  let dateObj: Date;

  if (d instanceof Date) {
    if (isNaN(d.getTime())) return "";
    dateObj = d;
  } else if (typeof d === "string") {
    const raw = d.trim();
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw);

    if (isDateOnly) {
      // Parse yyyy-MM-dd safely as local midnight
      try {
        dateObj = parseLocalDate(raw);
      } catch {
        dateObj = new Date(raw); // fallback
      }
    } else {
      // For full ISO/timestamp strings, let Date handle TZ
      dateObj = new Date(raw);
    }

    if (isNaN(dateObj.getTime())) return "";
  } else {
    return "";
  }

  const hours = asUTC ? dateObj.getUTCHours() : dateObj.getHours();
  const minutes = asUTC ? dateObj.getUTCMinutes() : dateObj.getMinutes();

  return `${pad2(hours)}:${pad2(minutes)}`;
}

