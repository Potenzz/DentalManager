export function getPageNumbers(current: number, total: number, maxButtons = 7) {
  const pages: (number | "...")[] = [];
  if (total <= maxButtons) {
    for (let i = 1; i <= total; i++) pages.push(i);
    return pages;
  }

  const half = Math.floor(maxButtons / 2);
  let start = Math.max(1, current - half);
  let end = Math.min(total, current + half);

  if (start === 1) end = Math.min(total, maxButtons);
  if (end === total) start = Math.max(1, total - maxButtons + 1);

  if (start > 1) pages.push(1, "...");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total) pages.push("...", total);

  return pages;
}
