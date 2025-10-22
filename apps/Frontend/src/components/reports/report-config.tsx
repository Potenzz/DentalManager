import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "lucide-react";
import { formatLocalDate, parseLocalDate } from "@/utils/dateUtils";
import { DateInput } from "@/components/ui/dateInput";

type ReportType =
  | "patients_with_balance"
  | "patients_no_balance"
  | "monthly_collections"
  | "collections_by_doctor"
  | "procedure_codes_by_doctor"
  | "payment_methods"
  | "insurance_vs_patient_payments"
  | "aging_report";

export default function ReportConfig({
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  selectedReportType,
  setSelectedReportType,
}: {
  startDate: string; // "" or "YYYY-MM-DD"
  endDate: string;
  setStartDate: (s: string) => void;
  setEndDate: (s: string) => void;
  selectedReportType: ReportType;
  setSelectedReportType: (r: ReportType) => void;
}) {
  // Convert incoming string -> Date | null using your parseLocalDate utility.
  // parseLocalDate can throw for invalid strings, so guard with try/catch.
  let startDateObj: Date | null = null;
  if (startDate) {
    try {
      startDateObj = parseLocalDate(startDate);
    } catch {
      startDateObj = null;
    }
  }

  let endDateObj: Date | null = null;
  if (endDate) {
    try {
      endDateObj = parseLocalDate(endDate);
    } catch {
      endDateObj = null;
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" /> Report Configuration
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="text-sm text-gray-500">
          Choose the report type and date range.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <DateInput
              label="Start Date"
              value={startDateObj}
              onChange={(d) => {
                setStartDate(d ? formatLocalDate(d) : "");
              }}
              disableFuture
            />
          </div>

          <div>
            <DateInput
              label="End Date"
              value={endDateObj}
              onChange={(d) => {
                setEndDate(d ? formatLocalDate(d) : "");
              }}
              disableFuture
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
                <SelectItem value="collections_by_doctor">
                  Collections by Doctor
                </SelectItem>
                <SelectItem value="patients_no_balance">
                  Patients with Zero Balance
                </SelectItem>
                <SelectItem value="monthly_collections">
                  Monthly Collections Summary
                </SelectItem>
                <SelectItem value="procedure_codes_by_doctor">
                  Procedure Codes by Doctor
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
      </CardContent>
    </Card>
  );
}
