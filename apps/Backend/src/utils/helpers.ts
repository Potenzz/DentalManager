export function normalizeInsuranceId(raw: unknown): string | undefined {
  if (raw === undefined || raw === null) return undefined;

  // Accept numbers too (e.g. 12345), but prefer strings
  let s: string;
  if (typeof raw === "number") {
    s = String(raw);
  } else if (typeof raw === "string") {
    s = raw;
  } else {
    // Not acceptable type
    throw new Error("Insurance ID must be a numeric string.");
  }

  // Remove all whitespace
  const cleaned = s.replace(/\s+/g, "");

  // If empty after cleaning, treat as undefined
  if (cleaned === "") return undefined;

  // Only digits allowed (since you said it's numeric)
  if (!/^\d+$/.test(cleaned)) {
    throw new Error("Insurance ID must contain only digits.");
  }

  return cleaned;
}
