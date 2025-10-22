import React, { useState } from "react";
import { Download } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import ReportConfig from "@/components/reports/report-config";
import PatientsWithBalanceReport from "@/components/reports/patients-with-balance-report";
import CollectionsByDoctorReport from "@/components/reports/collections-by-doctor-report";
import SummaryCards from "@/components/reports/summary-cards";
import { Button } from "@/components/ui/button";

type ReportType =
  | "patients_with_balance"
  | "patients_no_balance"
  | "monthly_collections"
  | "collections_by_doctor"
  | "procedure_codes_by_doctor"
  | "payment_methods"
  | "insurance_vs_patient_payments"
  | "aging_report";

export default function ReportPage() {
  const { user } = useAuth();

  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0] ?? "";
  });
  const [endDate, setEndDate] = useState<string>(
    () => new Date().toISOString().split("T")[0] ?? ""
  );

  const [selectedReportType, setSelectedReportType] = useState<ReportType>(
    "patients_with_balance"
  );
  const [isGenerating, setIsGenerating] = useState(false);

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      // placeholder: implement export per-report endpoint
      await new Promise((r) => setTimeout(r, 900));
    } finally {
      setIsGenerating(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-8">Please sign in to view reports.</div>
    );
  }

  return (
    <div className="container mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Financial Reports
          </h1>
          <p className="text-muted-foreground">
            Generate comprehensive financial reports for your practice
          </p>
        </div>

        {/* Export Button (Top Right) */}
        <Button
          onClick={generateReport}
          disabled={isGenerating}
          className="default"
        >
          <Download className="h-4 w-4 mr-2" />
          {isGenerating ? "Generating..." : "Export Report"}
        </Button>
      </div>

      <div className="mb-4">
        <ReportConfig
          startDate={startDate}
          endDate={endDate}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
          selectedReportType={selectedReportType}
          setSelectedReportType={setSelectedReportType}
        />
      </div>

      {/* SINGLE authoritative SummaryCards instance for the page */}
      <div className="mb-4">
        <SummaryCards startDate={startDate} endDate={endDate} />
      </div>

      <div>
        {selectedReportType === "patients_with_balance" && (
          <PatientsWithBalanceReport startDate={startDate} endDate={endDate} />
        )}

        {selectedReportType === "collections_by_doctor" && (
          <CollectionsByDoctorReport startDate={startDate} endDate={endDate} />
        )}

        {/* Add other report components here as needed */}
      </div>
    </div>
  );
}
