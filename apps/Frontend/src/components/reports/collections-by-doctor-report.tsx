import React, { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import PatientsBalancesList, { GenericRow } from "./patients-balances-list";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ExportReportButton from "./export-button";

type StaffOption = { id: number; name: string };

function fmtCurrency(v: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(v);
}

export default function CollectionsByDoctorReport({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate: string;
}) {
  const [staffId, setStaffId] = useState<string>("");

  const perPage = 10;
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const [cursorIndex, setCursorIndex] = useState<number>(0);
  const currentCursor = cursorStack[cursorIndex] ?? null;
  const pageIndex = cursorIndex + 1;

  // load staffs list for selector
  const { data: staffs } = useQuery<StaffOption[], Error>({
    queryKey: ["staffs"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/staffs");
      if (!res.ok) {
        const b = await res
          .json()
          .catch(() => ({ message: "Failed to load staffs" }));
        throw new Error(b.message || "Failed to load staffs");
      }
      return res.json();
    },
    staleTime: 60_000,
  });

  // --- balances query (paged rows) ---
  const {
    data: balancesResult,
    isLoading: isLoadingBalances,
    isError: isErrorBalances,
    refetch: refetchBalances,
    isFetching: isFetchingBalances,
  } = useQuery<
    {
      balances: any[];
      totalCount: number;
      nextCursor: string | null;
      hasMore: boolean;
    },
    Error
  >({
    queryKey: [
      "collections-by-doctor-balances",
      staffId,
      currentCursor,
      perPage,
      startDate,
      endDate,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", String(perPage));
      if (currentCursor) params.set("cursor", currentCursor);
      if (staffId) params.set("staffId", staffId);
      if (startDate) params.set("from", startDate);
      if (endDate) params.set("to", endDate);

      const res = await apiRequest(
        "GET",
        `/api/payments-reports/by-doctor/balances?${params.toString()}`
      );
      if (!res.ok) {
        const b = await res
          .json()
          .catch(() => ({ message: "Failed to load collections balances" }));
        throw new Error(b.message || "Failed to load collections balances");
      }
      return res.json();
    },
    enabled: Boolean(staffId),
  });

  // --- summary query (staff summary) ---
  const {
    data: summaryData,
    isLoading: isLoadingSummary,
    isError: isErrorSummary,
    refetch: refetchSummary,
    isFetching: isFetchingSummary,
  } = useQuery<
    {
      totalPatients: number;
      totalOutstanding: number | string;
      totalCollected: number | string;
      patientsWithBalance: number;
    },
    Error
  >({
    queryKey: ["collections-by-doctor-summary", staffId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (staffId) params.set("staffId", staffId);
      if (startDate) params.set("from", startDate);
      if (endDate) params.set("to", endDate);

      const res = await apiRequest(
        "GET",
        `/api/payments-reports/by-doctor/summary?${params.toString()}`
      );
      if (!res.ok) {
        const b = await res
          .json()
          .catch(() => ({ message: "Failed to load collections summary" }));
        throw new Error(b.message || "Failed to load collections summary");
      }
      return res.json();
    },
    enabled: Boolean(staffId),
  });

  const balances = balancesResult?.balances ?? [];
  const totalCount = balancesResult?.totalCount ?? undefined;
  const serverNextCursor = balancesResult?.nextCursor ?? null;
  const hasMore = Boolean(balancesResult?.hasMore ?? false);
  const summary = summaryData ?? null;

  const isLoadingRows = isLoadingBalances;
  const isErrorRows = isErrorBalances;
  const isFetching = isFetchingBalances || isFetchingSummary;

  // Reset pagination when filters change
  useEffect(() => {
    setCursorStack([null]);
    setCursorIndex(0);
  }, [staffId, startDate, endDate]);

  const handlePrev = useCallback(() => {
    setCursorIndex((i) => Math.max(0, i - 1));
  }, []);

  const handleNext = useCallback(() => {
    const idx = cursorIndex;
    const isLastKnown = idx === cursorStack.length - 1;

    if (isLastKnown) {
      if (serverNextCursor) {
        setCursorStack((s) => [...s, serverNextCursor]);
        setCursorIndex((i) => i + 1);
        // React Query will fetch automatically because queryKey includes currentCursor
      }
    } else {
      setCursorIndex((i) => i + 1);
    }
  }, [cursorIndex, cursorStack.length, serverNextCursor]);

  // Map server rows to GenericRow
  const genericRows: GenericRow[] = balances.map((r) => {
    const totalCharges = Number(r.totalCharges ?? 0);
    const totalPayments = Number(r.totalPayments ?? 0);
    const currentBalance = Number(r.currentBalance ?? 0);
    const name = `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() || "Unknown";

    return {
      id: String(r.patientId),
      name,
      currentBalance,
      totalCharges,
      totalPayments,
    };
  });

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-sm text-gray-700 block mb-1 ml-2">
            Select Doctor
          </label>
          <Select
            value={staffId || undefined}
            onValueChange={(v) => setStaffId(v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a doctor" />
            </SelectTrigger>

            <SelectContent>
              <SelectGroup>
                {staffs?.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary card (time-window based) */}
      {staffId && (
        <div className="mb-4">
          <Card className="pt-4 pb-4">
            <CardContent>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-800">
                    Doctor summary
                  </h2>
                  <p className="text-sm text-gray-500">
                    Data covers the selected time frame
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4">
                <div className="text-center">
                  <div className="text-lg font-semibold text-blue-600">
                    {summary ? Number(summary.totalPatients ?? 0) : "—"}
                  </div>
                  <p className="text-sm text-gray-600">
                    Total Patients (in window)
                  </p>
                </div>

                <div className="text-center">
                  <div className="text-lg font-semibold text-red-600">
                    {summary ? Number(summary.patientsWithBalance ?? 0) : "—"}
                  </div>
                  <p className="text-sm text-gray-600">With Balance</p>
                </div>

                <div className="text-center">
                  <div className="text-lg font-semibold text-green-600">
                    {summary
                      ? Math.max(
                          0,
                          Number(summary.totalPatients ?? 0) -
                            Number(summary.patientsWithBalance ?? 0)
                        )
                      : "—"}
                  </div>
                  <p className="text-sm text-gray-600">Zero Balance</p>
                </div>

                <div className="text-center">
                  <div className="text-lg font-semibold text-orange-600">
                    {summary
                      ? fmtCurrency(Number(summary.totalOutstanding ?? 0))
                      : "—"}
                  </div>
                  <p className="text-sm text-gray-600">Outstanding</p>
                </div>

                <div className="text-center">
                  <div className="text-lg font-semibold text-purple-600">
                    {summary
                      ? fmtCurrency(Number(summary.totalCollected ?? 0))
                      : "—"}
                  </div>
                  <p className="text-sm text-gray-600">Collected</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* List (shows all patients under doctor but per-row totals are time-filtered) */}
      {!staffId ? (
        <div className="text-sm text-gray-600">
          Please select a doctor to load collections.
        </div>
      ) : (
        <PatientsBalancesList
          rows={genericRows}
          reportType="collections_by_doctor"
          loading={isLoadingRows || isFetching}
          error={
            isErrorRows
              ? "Failed to load collections for the selected doctor/date range."
              : false
          }
          emptyMessage="No collection data for the selected doctor/date range."
          pageIndex={pageIndex}
          perPage={perPage}
          total={totalCount}
          onPrev={handlePrev}
          onNext={handleNext}
          hasPrev={cursorIndex > 0}
          hasNext={hasMore}
          headerRight={
            <ExportReportButton
              reportType="collections_by_doctor"
              from={startDate}
              to={endDate}
              staffId={Number(staffId)}
              className="mr-2"
            />
          }
        />
      )}
    </div>
  );
}
