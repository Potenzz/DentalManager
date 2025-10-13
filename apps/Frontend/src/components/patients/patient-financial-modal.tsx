import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { apiRequest } from "@/lib/queryClient";
import LoadingScreen from "../ui/LoadingScreen";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { FinancialRow } from "@repo/db/types";
import { getPageNumbers } from "@/utils/pageNumberGenerator";

export function PatientFinancialsModal({
  patientId,
  open,
  onOpenChange,
}: {
  patientId: number | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [rows, setRows] = useState<FinancialRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState<number>(50);
  const [offset, setOffset] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // patient summary to show in header
  const [patientName, setPatientName] = useState<string | null>(null);
  const [patientPID, setPatientPID] = useState<number | null>(null);

  useEffect(() => {
    if (!open || !patientId) return;
    fetchPatient();
    fetchRows();
  }, [open, patientId, limit, offset]);

  async function fetchPatient() {
    try {
      const res = await apiRequest("GET", `/api/patients/${patientId}`);
      if (!res.ok) {
        return;
      }
      const patient = await res.json();
      setPatientName(`${patient.firstName} ${patient.lastName}`);
      setPatientPID(patient.id);
    } catch (err) {
      console.error("Failed to fetch patient", err);
    }
  }

  async function fetchRows() {
    if (!patientId) return;
    setLoading(true);
    try {
      const url = `/api/patients/${patientId}/financials?limit=${limit}&offset=${offset}`;
      const res = await apiRequest("GET", url);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to load");
      }
      const data = await res.json();
      setRows(data.rows || []);
      setTotalCount(Number(data.totalCount || 0));
    } catch (err: any) {
      console.error(err);
      toast?.({
        title: "Error",
        description: err.message || "Failed to load financials",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function gotoRow(r: FinancialRow) {
    const openInNewTab = (url: string) => {
      if (typeof window !== "undefined") {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        // fallback for non-browser env (shouldn't happen in the client)
        navigate(url);
      }
    };

    const makePaymentUrl = (id: number) => `/payments?paymentId=${id}`;

    if (r.linked_payment_id) {
      openInNewTab(makePaymentUrl(r.linked_payment_id));
      return;
    }

    if (r.type === "PAYMENT") {
      openInNewTab(makePaymentUrl(r.id));
      return;
    }
  }

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  function setPage(page: number) {
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    setOffset((page - 1) * limit);
  }

  const startItem = useMemo(
    () => Math.min(offset + 1, totalCount || 0),
    [offset, totalCount]
  );
  const endItem = useMemo(
    () => Math.min(offset + limit, totalCount || 0),
    [offset, limit, totalCount]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95%] p-0 overflow-hidden">
        <div className="border-b px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-lg">Financials</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {patientName ? (
                  <>
                    <span className="font-medium">{patientName}</span>{" "}
                    {patientPID && (
                      <span className="text-muted-foreground">
                        • PID-{String(patientPID).padStart(4, "0")}
                      </span>
                    )}
                  </>
                ) : (
                  "Claims, payments and balances for this patient."
                )}
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="border rounded-md overflow-hidden">
            <div className="max-h-[56vh] overflow-auto">
              <Table className="min-w-full">
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead className="w-24">Type</TableHead>
                    <TableHead className="w-36">Date</TableHead>
                    <TableHead>Procedures Codes</TableHead>
                    <TableHead className="w-28">Tooth Number</TableHead>
                    <TableHead className="text-right w-28">Billed</TableHead>
                    <TableHead className="text-right w-28">Paid</TableHead>
                    <TableHead className="text-right w-28">Adjusted</TableHead>
                    <TableHead className="text-right w-28">Total Due</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12">
                        <LoadingScreen />
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r) => {
                      const billed = Number(r.total_billed ?? 0);
                      const paid = Number(r.total_paid ?? 0);
                      const adjusted = Number(r.total_adjusted ?? 0);
                      const totalDue = Number(r.total_due ?? 0);

                      const serviceLines = r.service_lines || [];

                      const procedureCodes =
                        serviceLines.length > 0
                          ? serviceLines
                              .map((sl: any) => sl.procedureCode)
                              .filter(Boolean)
                              .join(", ")
                          : r.linked_payment_id
                            ? "No Codes Given"
                            : "-";

                      const toothNumbers =
                        serviceLines.length > 0
                          ? serviceLines
                              .map((sl: any) =>
                                sl.toothNumber ? String(sl.toothNumber) : "-"
                              )
                              .join(", ")
                          : "-";

                      return (
                        <TableRow
                          key={`${r.type}-${r.id}`}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => gotoRow(r)}
                        >
                          <TableCell className="font-medium">
                            {r.type}
                          </TableCell>
                          <TableCell>
                            {r.date
                              ? new Date(r.date).toLocaleDateString()
                              : "-"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {procedureCodes}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {toothNumbers}
                          </TableCell>
                          <TableCell className="text-right">
                            {billed.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            {paid.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            {adjusted.toFixed(2)}
                          </TableCell>
                          <TableCell
                            className={`text-right ${totalDue > 0 ? "text-red-600" : "text-green-600"}`}
                          >
                            {totalDue.toFixed(2)}
                          </TableCell>
                          <TableCell>{r.status ?? "-"}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <div className="border-t px-6 py-3 bg-white">
          <div className="flex flex-col md:flex-row items-center md:items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Rows:</label>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setOffset(0);
                  }}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="text-sm text-muted-foreground">
                Showing <span className="font-medium">{startItem}</span>–
                <span className="font-medium">{endItem}</span> of{" "}
                <span className="font-medium">{totalCount}</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) setPage(currentPage - 1);
                      }}
                      className={
                        currentPage === 1
                          ? "pointer-events-none opacity-50"
                          : ""
                      }
                    />
                  </PaginationItem>

                  {getPageNumbers(currentPage, totalPages).map((page, idx) => (
                    <PaginationItem key={idx}>
                      {page === "..." ? (
                        <span className="px-2 text-gray-500">…</span>
                      ) : (
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setPage(Number(page));
                          }}
                          isActive={currentPage === page}
                        >
                          {page}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages) setPage(currentPage + 1);
                      }}
                      className={
                        currentPage === totalPages
                          ? "pointer-events-none opacity-50"
                          : ""
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
