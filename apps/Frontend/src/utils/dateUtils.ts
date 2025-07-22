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
export const formatDateToHumanReadable = (dateInput: string | Date): string => {
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
