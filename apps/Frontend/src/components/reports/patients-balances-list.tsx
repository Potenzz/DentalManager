import React from "react";
import { DollarSign } from "lucide-react";
import PaginationControls from "./pagination-controls";

export type GenericRow = {
  id: string | number;
  name: string;
  currentBalance: number;
  totalCharges: number;
  totalPayments: number;
};

export default function PatientsBalancesList({
  rows,
  reportType,
  loading,
  error,
  emptyMessage,
  pageIndex = 1, // 1-based
  perPage = 10,
  total, // optional totalCount from backend
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: {
  rows: GenericRow[];
  reportType?: string | null;
  loading?: boolean;
  error?: string | boolean;
  emptyMessage?: string;
  // cursor props (required)
  pageIndex?: number;
  perPage?: number;
  total?: number | undefined;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(v);

  const reportTypeTitle = (rt?: string | null) => {
    switch (rt) {
      case "patients_with_balance":
        return "Patients with Outstanding Balances";
      case "patients_no_balance":
        return "Patients with Zero Balance";
      case "monthly_collections":
        return "Monthly Collections";
      case "collections_by_doctor":
        return "Collections by Doctor";
      default:
        return "Balances";
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border">
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
          <h3 className="font-medium text-gray-900">
            {reportTypeTitle(reportType)}
          </h3>
        </div>

        <div className="divide-y min-h-[120px]">
          {loading ? (
            <div className="p-8 text-center text-gray-600">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <div>Loading {reportType ?? "data"}…</div>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-600">
              <div className="mb-2 font-semibold">Could not fetch data</div>
              <div className="text-sm text-red-500">
                {typeof error === "string"
                  ? error
                  : "An error occurred while loading the report."}
              </div>
            </div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>{emptyMessage ?? "No rows for this report."}</p>
            </div>
          ) : (
            rows.map((r) => (
              <div key={r.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium text-gray-900">{r.name}</h4>
                    <p className="text-sm text-gray-500">ID: {r.id}</p>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-semibold text-red-600">
                      {fmt(r.currentBalance)}
                    </div>
                    <div className="text-sm text-gray-500">
                      Charges: {fmt(r.totalCharges)} · Collected:{" "}
                      {fmt(r.totalPayments)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cursor pagination footer (cursor-only) */}
        <div className="bg-white px-4 py-3 border-t border-gray-200">
          <PaginationControls
            pageIndex={pageIndex}
            perPage={perPage}
            total={total}
            onPrev={onPrev}
            onNext={onNext}
            hasPrev={hasPrev}
            hasNext={hasNext}
          />
        </div>
      </div>
    </div>
  );
}
