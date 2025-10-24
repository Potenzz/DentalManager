import React, { useState } from "react";
import { apiRequest } from "@/lib/queryClient";

export default function ExportReportButton({
  reportType,
  from,
  to,
  staffId,
  className,
  labelCsv = "Download CSV",
}: {
  reportType: string; // e.g. "collections_by_doctor" or "patients_with_balance"
  from?: string;
  to?: string;
  staffId?: number | string | null;
  className?: string;
  labelCsv?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function downloadCsv() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("type", reportType);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (staffId) params.set("staffId", String(staffId));
      params.set("format", "csv"); // server expects format=csv

      const url = `/api/export-payments-reports/export?${params.toString()}`;

      // Use apiRequest for consistent auth headers/cookies
      const res = await apiRequest("GET", url);
      if (!res.ok) {
        const body = await res.text().catch(() => "Export failed");
        throw new Error(body || "Export failed");
      }

      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      const safeFrom = from || "all";
      const safeTo = to || "all";
      a.download = `${reportType}_${safeFrom}_${safeTo}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch (err: any) {
      console.error("Export CSV failed", err);
      alert("Export failed: " + (err?.message ?? "unknown error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className ?? "flex items-center gap-2"}>
      <button
        type="button"
        onClick={downloadCsv}
        disabled={loading}
        className="inline-flex items-center px-3 py-2 rounded border text-sm"
      >
        {loading ? "Preparing..." : labelCsv}
      </button>
    </div>
  );
}
