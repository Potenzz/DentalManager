export function getPageNumbers(current: number, total: number, maxButtons = 7) {
  const pages: (number | "...")[] = [];
  if (total <= maxButtons) {
    for (let i = 1; i <= total; i++) pages.push(i);
    return pages;
  }

  const delta = 2;
  const start = Math.max(2, current - delta);
  const end = Math.min(total - 1, current + delta);

  pages.push(1);
  if (start > 2) pages.push("...");

  for (let i = start; i <= end; i++) pages.push(i);

  if (end < total - 1) pages.push("...");
  if (total > 1) pages.push(total);

  return pages;
}
