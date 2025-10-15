// apps/Frontend/src/pages/reports-page.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DollarSign,
  FileText,
  Download,
  AlertCircle,
  Calendar,
  Users,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient"; // <<-- your helper
import type { PatientBalanceRow } from "@repo/db/types";

type ReportType =
  | "patients_with_balance"
  | "patients_no_balance"
  | "monthly_collections"
  | "collections_by_doctor"
  | "procedure_codes_by_doctor"
  | "payment_methods"
  | "insurance_vs_patient_payments"
  | "aging_report";

interface PatientBalancesResponse {
  balances: PatientBalanceRow[];
  totalCount: number;
}

export default function ReportsPage() {
  const { user } = useAuth();

  // pagination state for patient balances
  const [balancesPage, setBalancesPage] = useState<number>(1);
  const balancesPerPage = 10;

  // date range state (for dashboard summary)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );

  const [selectedReportType, setSelectedReportType] = useState<ReportType>(
    "patients_with_balance"
  );
  const [isGenerating, setIsGenerating] = useState(false);

  // --- 1) patient balances (paginated) using apiRequest ---
  const {
    data: patientBalancesResponse,
    isLoading: isLoadingBalances,
    isError: isErrorBalances,
  } = useQuery<PatientBalancesResponse>({
    queryKey: [
      "/api/payments-reports/patient-balances",
      balancesPage,
      balancesPerPage,
      startDate,
      endDate,
      selectedReportType,
    ],
    queryFn: async () => {
      const offset = (balancesPage - 1) * balancesPerPage;
      const minBalanceFlag = selectedReportType === "patients_with_balance";
      const endpoint = `/api/payments-reports/patient-balances?limit=${balancesPerPage}&offset=${offset}&minBalance=${minBalanceFlag}&from=${encodeURIComponent(
        String(startDate)
      )}&to=${encodeURIComponent(String(endDate))}`;
      const res = await apiRequest("GET", endpoint);
      if (!res.ok) {
        const body = await res
          .json()
          .catch(() => ({ message: "Failed to load patient balances" }));
        throw new Error(body.message || "Failed to load patient balances");
      }
      return res.json();
    },
    enabled: !!user,
  });

  const patientBalances: PatientBalanceRow[] =
    patientBalancesResponse?.balances ?? [];
  const patientBalancesTotal = patientBalancesResponse?.totalCount ?? 0;

  // --- 2) dashboard summary (separate route/storage) using apiRequest ---
  const { data: dashboardSummary, isLoading: isLoadingSummary } = useQuery({
    queryKey: [
      "/api/payments-reports/summary",
      String(startDate),
      String(endDate),
    ],
    queryFn: async () => {
      const endpoint = `/api/payments-reports/summary?from=${encodeURIComponent(
        String(startDate)
      )}&to=${encodeURIComponent(String(endDate))}`;
      const res = await apiRequest("GET", endpoint);
      if (!res.ok) {
        const body = await res
          .json()
          .catch(() => ({ message: "Failed to load dashboard summary" }));
        throw new Error(body.message || "Failed to load dashboard summary");
      }
      return res.json();
    },
    enabled: !!user,
  });

  // format currency for numbers in dollars (storage returns decimal numbers like 123.45)
  const formatCurrency = (amountDollars: number | undefined | null) => {
    const value = Number(amountDollars ?? 0);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  // summary stats: use dashboardSummary for totals (server-driven) and derive other counts from paginated balances
  const summaryStats = {
    totalPatients: dashboardSummary?.totalPatients ?? 0,
    // use the server-provided count of patients with balance inside range
    patientsWithBalance: dashboardSummary?.patientsWithBalance ?? 0,
    // patientsNoBalance: based on totalCount - patientsWithBalance (note: totalCount is number of patients with payments in range)
    patientsNoBalance: Math.max(
      0,
      (dashboardSummary?.totalPatients ?? 0) -
        (dashboardSummary?.patientsWithBalance ?? 0)
    ),
    totalOutstanding:
      dashboardSummary?.totalOutstanding ??
      patientBalances.reduce((s, b) => s + (b.currentBalance ?? 0), 0),
    totalCollected: dashboardSummary?.totalCollected ?? 0,
  };

  const generateReport = async () => {
    setIsGenerating(true);
    await new Promise((r) => setTimeout(r, 900));
    setIsGenerating(false);
  };

  // -------------------- report rendering (only patients_with_balance wired) --------------------
  // -------------------- report rendering (only patients_with_balance wired) --------------------
  const renderPatientsWithBalance = () => {
    // Use patientBalances for the current page list (already minBalance filtered if selectedReportType === 'patients_with_balance')
    const patientsWithBalance = patientBalances
      .filter((b) => (b.currentBalance ?? 0) > 0)
      .map((b) => ({
        patientId: b.patientId,
        patientName: `${b.firstName ?? "Unknown"} ${b.lastName ?? ""}`.trim(),
        currentBalance: b.currentBalance ?? 0,
        totalCharges: b.totalCharges ?? 0,
        totalPayments: b.totalPayments ?? 0,
      }));

    const totalOutstanding = patientsWithBalance.reduce(
      (s, p) => s + p.currentBalance,
      0
    );
    const avgBalance = patientsWithBalance.length
      ? totalOutstanding / patientsWithBalance.length
      : 0;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">
                {summaryStats.patientsWithBalance}
              </div>
              <p className="text-sm text-gray-600">Patients with Balance</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(summaryStats.totalOutstanding)}
              </div>
              <p className="text-sm text-gray-600">Total Outstanding</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(avgBalance)}
              </div>
              <p className="text-sm text-gray-600">
                Average Balance (visible page)
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white rounded-lg border">
          <div className="px-4 py-3 border-b bg-gray-50">
            <h3 className="font-medium text-gray-900">
              Patients with Outstanding Balances
            </h3>
          </div>

          <div className="divide-y">
            {patientsWithBalance.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No patients have outstanding balances on this page</p>
              </div>
            ) : (
              patientsWithBalance.map((p) => (
                <div key={p.patientId} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {p.patientName}
                      </h4>
                      <p className="text-sm text-gray-500">
                        Patient ID: {p.patientId}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-semibold text-red-600">
                        {formatCurrency(p.currentBalance)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Charges: {formatCurrency(p.totalCharges)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* pagination controls for balances */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600">
            Showing {(balancesPage - 1) * balancesPerPage + 1} -{" "}
            {Math.min(balancesPage * balancesPerPage, patientBalancesTotal)} of{" "}
            {patientBalancesTotal}
          </div>

          <div className="space-x-2">
            <Button
              disabled={balancesPage <= 1}
              onClick={() => setBalancesPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              disabled={balancesPage * balancesPerPage >= patientBalancesTotal}
              onClick={() => setBalancesPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderReportContent = () => {
    if (isLoadingBalances || isLoadingSummary) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading report data...</p>
        </div>
      );
    }

    if ((patientBalances?.length ?? 0) === 0) {
      return (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Financial Data Not Available
          </h3>
          <p className="text-gray-600 mb-4">
            No patient balance data yet. Add payments/service lines to populate
            reports.
          </p>
          <div className="text-sm text-gray-500">
            <p>
              Date range: {startDate} to {endDate}
            </p>
          </div>
        </div>
      );
    }

    switch (selectedReportType) {
      case "patients_with_balance":
        return renderPatientsWithBalance();

      default:
        return (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Report Type Not Implemented
            </h3>
            <p className="text-gray-600">
              The "{selectedReportType}" report is being developed. For now use
              "Patients with Outstanding Balance".
            </p>
          </div>
        );
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Financial Reports
          </h1>
          <p className="text-gray-600">
            Generate comprehensive financial reports for your practice
          </p>
        </div>

        <Button
          onClick={generateReport}
          disabled={isGenerating}
          className="mt-4 md:mt-0"
        >
          <Download className="h-4 w-4 mr-2" />{" "}
          {isGenerating ? "Generating..." : "Export Report"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Report Configuration
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-type">Report Type</Label>
              <Select
                value={selectedReportType}
                onValueChange={(v) => setSelectedReportType(v as ReportType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patients_with_balance">
                    Patients with Outstanding Balance
                  </SelectItem>
                  <SelectItem value="patients_no_balance">
                    Patients with Zero Balance
                  </SelectItem>
                  <SelectItem value="monthly_collections">
                    Monthly Collections Summary
                  </SelectItem>
                  <SelectItem value="collections_by_doctor">
                    Collections by Each Doctor
                  </SelectItem>
                  <SelectItem value="procedure_codes_by_doctor">
                    Procedure Codes Analysis by Doctors
                  </SelectItem>
                  <SelectItem value="payment_methods">
                    Payment Methods Breakdown
                  </SelectItem>
                  <SelectItem value="insurance_vs_patient_payments">
                    Insurance vs Patient Payments
                  </SelectItem>
                  <SelectItem value="aging_report">
                    Accounts Receivable Aging
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600">
                {summaryStats.totalPatients}
              </div>
              <p className="text-sm text-gray-600">Total Patients</p>
            </div>

            <div className="text-center">
              <div className="text-lg font-semibold text-red-600">
                {summaryStats.patientsWithBalance}
              </div>
              <p className="text-sm text-gray-600">With Balance</p>
            </div>

            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">
                {summaryStats.patientsNoBalance}
              </div>
              <p className="text-sm text-gray-600">Zero Balance</p>
            </div>

            <div className="text-center">
              <div className="text-lg font-semibold text-orange-600">
                {formatCurrency(summaryStats.totalOutstanding)}
              </div>
              <p className="text-sm text-gray-600">Outstanding</p>
            </div>

            <div className="text-center">
              <div className="text-lg font-semibold text-purple-600">
                {formatCurrency(summaryStats.totalCollected)}
              </div>
              <p className="text-sm text-gray-600">Collected</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {selectedReportType === "patients_with_balance"
              ? "Patients with Outstanding Balance"
              : selectedReportType}
          </CardTitle>
        </CardHeader>

        <CardContent>{renderReportContent()}</CardContent>
      </Card>
    </div>
  );
}
