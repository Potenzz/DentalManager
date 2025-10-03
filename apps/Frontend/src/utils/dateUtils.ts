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
 * Strictly format to "YYYY-MM-DD" without timezone shifts.
 * - If input is already "YYYY-MM-DD", return it unchanged.
 * - If input is a Date, use its local year/month/day directly (no TZ conversion).
 * - If input is an ISO/timestamp string, first strip to "YYYY-MM-DD" safely.
 */
export function formatLocalDate(input: string | Date): string {
  if (!input) return "";

  // Case 1: already "YYYY-MM-DD"
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }

  // Case 2: Date object (use its local fields directly)
  if (input instanceof Date) {
    if (isNaN(input.getTime())) return "";
    const year = input.getFullYear();
    const month = `${input.getMonth() + 1}`.padStart(2, "0");
    const day = `${input.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Case 3: string with time/ISO — strip the "YYYY-MM-DD" part only
  if (typeof input === "string") {
    const parts = input.split("T");
    const dateString = parts.length > 0 && parts[0] ? parts[0] : "";
    return dateString;
  }

  return "";
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

// ---------- formatUTCDateStringToLocal ----------
/**
 * If `dateStr` is:
 * - date-only "YYYY-MM-DD" -> returns it unchanged
 * - ISO instant/string -> returns the LOCAL calendar date "YYYY-MM-DD" of that instant
 */
export function formatUTCDateStringToLocal(dateStr: string): string {
  if (!dateStr) return "";
  if (isDateOnlyString(dateStr)) return dateStr;

  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    // fallback: strip time part and treat as local date
    try {
      const maybe = parseLocalDate(dateStr);
      return formatLocalDate(maybe);
    } catch {
      return "";
    }
  }
  return formatLocalDate(d); // uses local fields of the instant
}

/**
 * Frontend-only normalizer.
 * - Returns "YYYY-MM-DD" string representing the calendar date the user expects.
 * - This avoids producing ISO instants that confuse frontend display.
 *
 * Use this for UI display or for sending date-only values to backend if backend accepts date-only.
 */
export function normalizeToISOString(date: Date | string): string {
  const parsed = parseLocalDate(date); // returns local-midnight-based Date
  return formatLocalDate(parsed); // "YYYY-MM-DD"
}

// ---------- helpers ----------
const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function isDateOnlyString(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

// ---------- formatDateToHumanReadable ----------
/**
 * Frontend-safe: never lets timezone shift the displayed calendar day.
 * - "YYYY-MM-DD" strings are shown exactly.
 * - Date objects are shown using their calendar fields (getFullYear/getMonth/getDate).
 * - ISO/timestamp strings are parsed and shown using UTC date component so they do not flip on client TZ.
 */
export function formatDateToHumanReadable(dateInput?: string | Date): string {
  if (!dateInput) return "N/A";

  // date-only string -> show as-is
  if (typeof dateInput === "string" && isDateOnlyString(dateInput)) {
    const [y, m, d] = dateInput.split("-");
    if (!y || !m || !d) return "Invalid Date";
    return `${MONTH_SHORT[parseInt(m, 10) - 1]} ${d}, ${y}`;
  }

  // Handle Date object
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return "Invalid Date";
    const dd = String(dateInput.getDate());
    const mm = MONTH_SHORT[dateInput.getMonth()];
    const yy = dateInput.getFullYear();
    return `${mm} ${dd}, ${yy}`;
  }

  // Handle ISO/timestamp string (UTC-based to avoid shifting)
  const parsed = new Date(dateInput);
  if (isNaN(parsed.getTime())) {
    console.error("Invalid date input provided:", dateInput);
    return "Invalid Date";
  }
  const dd = String(parsed.getUTCDate());
  const mm = MONTH_SHORT[parsed.getUTCMonth()];
  const yy = parsed.getUTCFullYear();
  return `${mm} ${dd}, ${yy}`;
}

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
export function convertOCRDate(
  input: string | number | null | undefined
): Date {
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
