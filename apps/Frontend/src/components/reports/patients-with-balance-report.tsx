import React, { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { PatientBalanceRow } from "@repo/db/types";
import PatientsBalancesList from "./patients-balances-list";
import ExportReportButton from "./export-button";

type Resp = {
  balances: PatientBalanceRow[];
  totalCount?: number; // optional
  nextCursor?: string | null;
  hasMore?: boolean;
};

export default function PatientsWithBalanceReport({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate: string;
}) {
  const balancesPerPage = 10;
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const [cursorIndex, setCursorIndex] = useState(0);
  const currentCursor = cursorStack[cursorIndex] ?? null;
  const pageIndex = cursorIndex + 1; // 1-based for UI

  const { data, isLoading, isError, refetch } = useQuery<Resp, Error>({
    queryKey: [
      "/api/payments-reports/patient-balances",
      currentCursor,
      balancesPerPage,
      startDate,
      endDate,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", String(balancesPerPage));
      if (currentCursor) params.set("cursor", currentCursor);
      if (startDate) params.set("from", startDate);
      if (endDate) params.set("to", endDate);
      const res = await apiRequest(
        "GET",
        `/api/payments-reports/patients-with-balances?${params.toString()}`
      );
      if (!res.ok) {
        const body = await res
          .json()
          .catch(() => ({ message: "Failed to load patient balances" }));
        throw new Error(body.message || "Failed to load patient balances");
      }
      return res.json();
    },
    enabled: true,
  });

  const balances = data?.balances ?? [];
  const totalCount = data?.totalCount ?? undefined;
  const nextCursor = data?.nextCursor ?? null;
  const hasMore = data?.hasMore ?? false;

  useEffect(() => {
    setCursorStack([null]);
    setCursorIndex(0);
    refetch();
  }, [startDate, endDate]);

  const handleNext = useCallback(() => {
    const idx = cursorIndex;
    const isLastKnown = idx === cursorStack.length - 1;
    if (isLastKnown) {
      if (nextCursor) {
        setCursorStack((s) => [...s, nextCursor]);
        setCursorIndex((i) => i + 1);
      }
    } else {
      setCursorIndex((i) => i + 1);
    }
  }, [cursorIndex, cursorStack.length, nextCursor]);

  const handlePrev = useCallback(() => {
    setCursorIndex((i) => Math.max(0, i - 1));
  }, []);

  const normalized = balances.map((b) => {
    const currentBalance = Number(b.currentBalance ?? 0);
    const totalCharges = Number(b.totalCharges ?? 0);
    const totalPayments =
      b.totalPayments != null
        ? Number(b.totalPayments)
        : Number(totalCharges - currentBalance);
    return {
      id: b.patientId,
      name: `${b.firstName ?? "Unknown"} ${b.lastName ?? ""}`.trim(),
      currentBalance,
      totalCharges,
      totalPayments,
    };
  });

  return (
    <div>
      <div className="mb-4">
        <PatientsBalancesList
          rows={normalized}
          reportType="patients_with_balance"
          loading={isLoading}
          error={
            isError
              ? "Failed to load patient balances for the selected date range."
              : false
          }
          emptyMessage="No patient balances for the selected date range."
          pageIndex={pageIndex}
          perPage={balancesPerPage}
          total={totalCount}
          onPrev={handlePrev}
          onNext={handleNext}
          hasPrev={cursorIndex > 0}
          hasNext={hasMore}
          headerRight={
            <ExportReportButton
              reportType="patients_with_balance"
              from={startDate}
              to={endDate}
              className="mr-2"
            />
          }
        />
      </div>
    </div>
  );
}
