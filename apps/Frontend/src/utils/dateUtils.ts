/**
 * Use parseLocalDate when you need a Date object at local midnight
 * (for calendars, date pickers, Date math in the browser).
 *
 *
 * Parse a date string in yyyy-MM-dd format (assumed local) into a JS Date object.
 * No timezone conversion is applied. Returns a Date at midnight local time.
 *
 * * Accepts:
 * - "YYYY-MM-DD"
 * - ISO/timestamp string (will take left-of-'T' date portion)
 * - Date object (will return a new Date set to that local calendar day at midnight)
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
 * Use formatLocalDate when you need a date-only string "YYYY-MM-DD" (for displaying stable date values in UI lists,
 * sending to APIs, storing in sessionStorage/DB where date-only is required).
 *
 *
 * Format a date value into a "YYYY-MM-DD" string with **no timezone shifts**.
 *
 * Handles all common input cases:
 * - "YYYY-MM-DD" string → returned as-is.
 * - ISO/timestamp string → takes the date portion before "T" (safe, no TZ math).
 * - Date object:
 *   - If created via `new Date("2025-07-15T00:00:00Z")` (ISO instant),
 *     UTC vs local calendar components may differ. In this case, use UTC
 *     fields so the original calendar day (15th) is preserved across timezones.
 *   - If created via `parseLocalDate("2025-07-15")` or `new Date(2025, 6, 15)`
 *     (local-midnight Date), UTC and local calendar components match,
 *     so local fields are safe to use.
 *
 * This hybrid logic ensures:
 * - DOBs and other date-only values will never appear off by one day
 *   due to timezone differences.
 * - Works with both string and Date inputs without requiring code changes elsewhere.
 */
export function formatLocalDate(input?: string | Date): string {
  if (!input) return "";

  // Case 1: already "YYYY-MM-DD" string
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }

  // Case 2: ISO/timestamp string -> take the left-of-T portion
  if (typeof input === "string") {
    const dateString = input.split("T")[0] ?? "";
    return dateString;
  }

  // Case 3: Date object
  if (input instanceof Date) {
    if (isNaN(input.getTime())) return "";

    // HYBRID LOGIC:
    // - If this Date was likely created from an ISO instant at UTC midnight
    //   (e.g. "2025-10-15T00:00:00Z"), then getUTCHours() === 0 but getHours()
    //   will be non-zero in most non-UTC timezones. In that case use UTC date
    //   parts to preserve the original calendar day.
    // - Otherwise use the local calendar fields (safe for local-midnight Dates).
    const utcHours = input.getUTCHours();
    const localHours = input.getHours();
    const useUTC = utcHours === 0 && localHours !== 0;

    const year = useUTC ? input.getUTCFullYear() : input.getFullYear();
    const month = useUTC ? input.getUTCMonth() + 1 : input.getMonth() + 1;
    const day = useUTC ? input.getUTCDate() : input.getDate();

    const m = `${month}`.padStart(2, "0");
    const d = `${day}`.padStart(2, "0");
    return `${year}-${m}-${d}`;
  }

  return "";
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
 * Frontend-safe human readable formatter.
 *
 * Rules:
 * - If input is a date-only string "YYYY-MM-DD", format it directly (no TZ math).
 * - If input is a Date object, use its local calendar fields (getFullYear/getMonth/getDate).
 * - If input is any other string (ISO/timestamp), DO NOT call new Date(isoString) directly
 *   for display. Instead, use parseLocalDate(dateInput) to extract the local calendar day
 *   (strip time portion) and render that. This prevents off-by-one day drift.
 *
 * Output example: "Oct 7, 2025"
 */
export function formatDateToHumanReadable(dateInput?: string | Date): string {
  if (!dateInput) return "N/A";

  // date-only string -> show as-is using MONTH_SHORT
  if (typeof dateInput === "string" && isDateOnlyString(dateInput)) {
    const [y, m, d] = dateInput.split("-");
    if (!y || !m || !d) return "Invalid Date";
    return `${MONTH_SHORT[parseInt(m, 10) - 1]} ${d}, ${y}`;
  }

  // Date object -> use local calendar fields
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return "Invalid Date";
    const dd = String(dateInput.getDate());
    const mm = MONTH_SHORT[dateInput.getMonth()];
    const yy = dateInput.getFullYear();
    return `${mm} ${dd}, ${yy}`;
  }

  // Other string (likely ISO/timestamp) -> normalize via parseLocalDate
  // This preserves the calendar day the user expects (no timezone drift).
  if (typeof dateInput === "string") {
    try {
      const localDate = parseLocalDate(dateInput);
      const dd = String(localDate.getDate());
      const mm = MONTH_SHORT[localDate.getMonth()];
      const yy = localDate.getFullYear();
      return `${mm} ${dd}, ${yy}`;
    } catch (err) {
      console.error("Invalid date input provided:", dateInput, err);
      return "Invalid Date";
    }
  }

  return "Invalid Date";
}

// ---------------- OCR Date helper --------------------------
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
