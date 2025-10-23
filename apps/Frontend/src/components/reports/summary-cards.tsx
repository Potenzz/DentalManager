import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

type SummaryResp = {
  totalPatients?: number;
  patientsWithBalance?: number;
  totalOutstanding?: number;
  totalCollected?: number;
};

function fmtCurrency(v: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(v);
}

export default function SummaryCards({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate: string;
}) {
  // Query the server summary for the given date range
  const { data, isLoading, isError } = useQuery<SummaryResp, Error>({
    queryKey: ["/api/payments-reports/summary", startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.set("from", startDate);
      if (endDate) params.set("to", endDate);
      const endpoint = `/api/payments-reports/summary?${params.toString()}`;
      const res = await apiRequest("GET", endpoint);
      if (!res.ok) {
        const body = await res
          .json()
          .catch(() => ({ message: "Failed to load dashboard summary" }));
        throw new Error(body?.message ?? "Failed to load dashboard summary");
      }
      return res.json();
    },
    enabled: Boolean(startDate && endDate),
  });

  const totalPatients = data?.totalPatients ?? 0;
  const patientsWithBalance = data?.patientsWithBalance ?? 0;
  const patientsNoBalance = Math.max(
    0,
    (data?.totalPatients ?? 0) - (data?.patientsWithBalance ?? 0)
  );
  const totalOutstanding = data?.totalOutstanding ?? 0;
  const totalCollected = data?.totalCollected ?? 0;

  return (
    <Card className="pt-4 pb-4">
      <CardContent>
        {/* Heading */}
        <div className="mb-3">
          <h2 className="text-base font-semibold text-gray-800">
            Report summary
          </h2>
          <p className="text-sm text-gray-500">
            Data covers the selected time frame
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">
              {isLoading ? "—" : totalPatients}
            </div>
            <p className="text-sm text-gray-600">Total Patients</p>
          </div>

          <div className="text-center">
            <div className="text-lg font-semibold text-red-600">
              {isLoading ? "—" : patientsWithBalance}
            </div>
            <p className="text-sm text-gray-600">With Balance</p>
          </div>

          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">
              {isLoading ? "—" : patientsNoBalance}
            </div>
            <p className="text-sm text-gray-600">Zero Balance</p>
          </div>

          <div className="text-center">
            <div className="text-lg font-semibold text-orange-600">
              {isLoading ? "—" : fmtCurrency(totalOutstanding)}
            </div>
            <p className="text-sm text-gray-600">Outstanding</p>
          </div>

          <div className="text-center">
            <div className="text-lg font-semibold text-purple-600">
              {isLoading ? "—" : fmtCurrency(totalCollected)}
            </div>
            <p className="text-sm text-gray-600">Collected</p>
          </div>
        </div>

        {isError && (
          <div className="mt-3 text-sm text-red-600">
            Failed to load summary. Check server or network.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
