export function extractDobParts(date: Date) {
  return {
    dob_day: date.getUTCDate(),
    dob_month: date.getUTCMonth() + 1,
    dob_year: date.getUTCFullYear(),
  };
}
