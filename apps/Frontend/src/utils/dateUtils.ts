import { format } from "date-fns";

/**
 * Parse a date string in yyyy-MM-dd format (assumed local) into a JS Date object.
 * No timezone conversion is applied. Returns a Date at midnight local time.
 */
export function parseLocalDateString(dateStr: string): Date {
  const parts = dateStr.split("-");

  // Destructure with fallback
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



/**
 * Format a JS Date object as a `yyyy-MM-dd` string (in local time).
 * Useful for saving date-only data without time component.
 */
export function formatLocalDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Get a Date object representing midnight UTC for a given local date.
 * Useful for comparing or storing dates consistently across timezones.
 */
export function toUTCDate(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

/**
 * Converts a stored UTC date string (e.g. from DB) into a Date object
 * and formats it as local yyyy-MM-dd string for UI use.
 */
export function formatUTCDateStringToLocal(dateStr: string): string {
  const date = new Date(dateStr); // parsed as UTC
  return formatLocalDate(date);
}

/**
 * Ensure any date (Date|string) is formatted to ISO string for consistent backend storage.
 * If it's already a string, pass through. If it's a Date, convert to ISO.
 */
export function normalizeToISOString(date: Date | string): string {
  return date instanceof Date ? date.toISOString() : date;
}
