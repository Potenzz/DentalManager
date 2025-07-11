export function parseDobParts(input: string): { from: Date; to: Date } | null {
  if (!input || typeof input !== "string") return null;

  const parts = input.trim().split(/[\s/-]+/).filter(Boolean);

  if (parts.length === 1) {
    const part = parts[0]?.toLowerCase();

    // Year
    if (part && /^\d{4}$/.test(part)) {
      const year = parseInt(part);
      return {
        from: new Date(Date.UTC(year, 0, 1)),
        to: new Date(Date.UTC(year, 11, 31, 23, 59, 59)),
      };
    }

    // Month
    const month = part ? parseMonth(part) : null;
    if (month !== null) {
      return {
        from: new Date(Date.UTC(1900, month, 1)),
        to: new Date(Date.UTC(2100, month + 1, 0, 23, 59, 59)),
      };
    }

    return null;
  }

  if (parts.length === 2) {
    const [part1, part2] = parts;
    const day = tryParseInt(part1);
    const month = part2 ? parseMonth(part2) : null;

    if (day !== null && month !== null) {
      return {
        from: new Date(Date.UTC(1900, month, day)),
        to: new Date(Date.UTC(2100, month, day, 23, 59, 59)),
      };
    }

    return null;
  }

  if (parts.length === 3) {
    const [part1, part2, part3] = parts;
    const day = tryParseInt(part1);
    const month = part2 ? parseMonth(part2) : null;
    const year = tryParseInt(part3);

    if (day !== null && month !== null && year !== null) {
      return {
        from: new Date(Date.UTC(year, month, day)),
        to: new Date(Date.UTC(year, month, day, 23, 59, 59)),
      };
    }

    return null;
  }

  return null;
}

function parseMonth(input: string): number | null {
  const normalized = input.toLowerCase();
  const months = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
  ];

  const index = months.findIndex(
    (m) => m === normalized || m.startsWith(normalized)
  );
  return index !== -1 ? index : null;
}

function tryParseInt(value?: string): number | null {
  if (!value) return null;
  const parsed = parseInt(value);
  return isNaN(parsed) ? null : parsed;
}
