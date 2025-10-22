import React, { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import PatientsBalancesList, { GenericRow } from "./patients-balances-list";

type DoctorOption = { id: string; name: string };
type DoctorCollectionRow = {
  doctorId: string;
  doctorName: string;
  totalCollected?: number;
  totalCharges?: number;
  totalPayments?: number;
  currentBalance?: number;
};

type CollectionsResp = {
  rows: DoctorCollectionRow[];
  totalCount?: number;
  nextCursor?: string | null;
  hasMore?: boolean;
};

export default function CollectionsByDoctorReport({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate: string;
}) {
  const [doctorId, setDoctorId] = useState<string | "">("");

  // pagination (cursor) state
  const perPage = 10;
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const [cursorIndex, setCursorIndex] = useState<number>(0);
  const currentCursor = cursorStack[cursorIndex] ?? null;
  const pageIndex = cursorIndex + 1; // 1-based for UI

  // load doctors for selector
  const { data: doctors } = useQuery<DoctorOption[], Error>({
    queryKey: ["doctors"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/doctors");
      if (!res.ok) {
        const b = await res
          .json()
          .catch(() => ({ message: "Failed to load doctors" }));
        throw new Error(b.message || "Failed to load doctors");
      }
      return res.json();
    },
    staleTime: 60_000,
  });

  // rows (collections by doctor) - cursor-based request
  const {
    data: collectionData,
    isLoading: isLoadingRows,
    isError: isErrorRows,
    refetch,
  } = useQuery<CollectionsResp, Error>({
    queryKey: [
      "collections-by-doctor-rows",
      doctorId,
      currentCursor,
      perPage,
      startDate,
      endDate,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", String(perPage));
      if (currentCursor) params.set("cursor", currentCursor);
      if (doctorId) params.set("doctorId", doctorId);
      if (startDate) params.set("from", startDate);
      if (endDate) params.set("to", endDate);

      const res = await apiRequest(
        "GET",
        `/api/payments-reports/collections-by-doctor?${params.toString()}`
      );
      if (!res.ok) {
        const b = await res
          .json()
          .catch(() => ({ message: "Failed to load collections" }));
        throw new Error(b.message || "Failed to load collections");
      }
      return res.json();
    },
    enabled: true,
    staleTime: 30_000,
  });

  // derived pagination info
  const rows = collectionData?.rows ?? [];
  const totalCount = collectionData?.totalCount ?? undefined;
  const nextCursor = collectionData?.nextCursor ?? null;
  const hasMore = collectionData?.hasMore ?? false;

  // reset cursor when filters change (doctor/date)
  useEffect(() => {
    setCursorStack([null]);
    setCursorIndex(0);
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId, startDate, endDate]);

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

  // Map doctor rows into GenericRow (consistent)
  const mapDoctorToGeneric = (r: DoctorCollectionRow): GenericRow => {
    const totalCharges = Number(r.totalCharges ?? 0);
    const totalPayments = Number(r.totalCollected ?? r.totalPayments ?? 0);
    return {
      id: r.doctorId,
      name: r.doctorName,
      currentBalance: 0,
      totalCharges,
      totalPayments,
    };
  };

  const genericRows: GenericRow[] = rows.map(mapDoctorToGeneric);

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-sm text-gray-700 block mb-1">Doctor</label>
          <select
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            className="w-full border rounded px-2 py-1"
          >
            <option value="">All doctors</option>
            {doctors?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <PatientsBalancesList
        rows={genericRows}
        reportType="collections_by_doctor"
        loading={isLoadingRows}
        error={
          isErrorRows
            ? "Failed to load collections for the selected doctor/date range."
            : false
        }
        emptyMessage="No collection data for the selected doctor/date range."
        // cursor props (cursor-only approach)
        pageIndex={pageIndex}
        perPage={perPage}
        total={totalCount}
        onPrev={handlePrev}
        onNext={handleNext}
        hasPrev={cursorIndex > 0}
        hasNext={hasMore}
      />
    </div>
  );
}
