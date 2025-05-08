import { useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  SortingState,
  getSortedRowModel,
  ColumnFiltersState,
  getFilteredRowModel,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search...",
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 5,
  });

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-4">
      {searchKey && (
        <div className="flex items-center relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder={searchPlaceholder}
            value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn(searchKey)?.setFilterValue(event.target.value)
            }
            className="max-w-sm pl-10"
          />
        </div>
      )}
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length > 0 && (
            <div>
              Showing{" "}
              <strong>
                {table.getState().pagination.pageIndex *
                  table.getState().pagination.pageSize +
                  1}
              </strong>{" "}
              to{" "}
              <strong>
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) *
                    table.getState().pagination.pageSize,
                  table.getFilteredRowModel().rows.length
                )}
              </strong>{" "}
              of <strong>{table.getFilteredRowModel().rows.length}</strong>{" "}
              results
            </div>
          )}
        </div>

        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className={!table.getCanPreviousPage() ? "opacity-50 cursor-not-allowed" : ""}
              />
            </PaginationItem>

            {/* Page numbers */}
            {Array.from(
              { length: Math.min(5, table.getPageCount()) },
              (_, i) => {
                const pageIndex = i;
                const isCurrentPage =
                  pageIndex === table.getState().pagination.pageIndex;
                
                if (table.getPageCount() > 5 && pageIndex === 3) {
                  return (
                    <PaginationItem key={pageIndex}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  );
                } else if (table.getPageCount() > 5 && pageIndex === 4) {
                  const lastPageIndex = table.getPageCount() - 1;
                  return (
                    <PaginationItem key={pageIndex}>
                      <PaginationLink
                        onClick={() => table.setPageIndex(lastPageIndex)}
                        isActive={lastPageIndex === table.getState().pagination.pageIndex}
                      >
                        {lastPageIndex + 1}
                      </PaginationLink>
                    </PaginationItem>
                  );
                } else {
                  return (
                    <PaginationItem key={pageIndex}>
                      <PaginationLink
                        onClick={() => table.setPageIndex(pageIndex)}
                        isActive={isCurrentPage}
                      >
                        {pageIndex + 1}
                      </PaginationLink>
                    </PaginationItem>
                  );
                }
              }
            )}

            <PaginationItem>
              <PaginationNext
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className={!table.getCanNextPage() ? "opacity-50 cursor-not-allowed" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
