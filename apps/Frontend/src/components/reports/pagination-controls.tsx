import React from "react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export default function PaginationControls({
  pageIndex,
  perPage,
  total,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: {
  /** 1-based page index (for display). Pass cursorIndex + 1 from parent. */
  pageIndex: number;
  perPage: number;
  /** optional totalCount from backend (if provided) */
  total?: number | undefined;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  const startItem = total === 0 ? 0 : (pageIndex - 1) * perPage + 1;
  const endItem = Math.min(pageIndex * perPage, total ?? pageIndex * perPage);

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="text-sm text-muted-foreground whitespace-nowrap">
        {typeof total === "number"
          ? `Showing ${startItem}-${endItem} of ${total}`
          : `Page ${pageIndex}`}
      </div>

      <div>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e: any) => {
                  e.preventDefault();
                  if (hasPrev) onPrev();
                }}
                className={hasPrev ? "" : "pointer-events-none opacity-50"}
              />
            </PaginationItem>

            <div className="px-2" />

            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e: any) => {
                  e.preventDefault();
                  if (hasNext) onNext();
                }}
                className={hasNext ? "" : "pointer-events-none opacity-50"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
