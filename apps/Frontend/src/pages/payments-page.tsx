import { useEffect, useRef, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PaymentsRecentTable from "@/components/payments/payments-recent-table";
import PaymentsOfPatientModal from "@/components/payments/payments-of-patient-table";
import PaymentOCRBlock from "@/components/payments/payment-ocr-block";
import { useLocation } from "wouter";
import { Patient } from "@repo/db/types";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

export default function PaymentsPage() {
  const [paymentPeriod, setPaymentPeriod] = useState<string>("all-time");

  // for auto-open from appointment redirect
  const [location] = useLocation();
  const [initialPatientForModal, setInitialPatientForModal] =
    useState<Patient | null>(null);
  const [openPatientModalFromAppointment, setOpenPatientModalFromAppointment] =
    useState(false);

  // small helper: remove query params silently
  const clearUrlParams = (params: string[]) => {
    try {
      const url = new URL(window.location.href);
      let changed = false;
      for (const p of params) {
        if (url.searchParams.has(p)) {
          url.searchParams.delete(p);
          changed = true;
        }
      }
      if (changed)
        window.history.replaceState({}, document.title, url.toString());
    } catch (e) {
      // ignore
    }
  };

  // case1: If payments page is opened via appointment-page, /payments?appointmentId=123 -> fetch patient and open modal
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const appointmentIdParam = params.get("appointmentId");
    if (!appointmentIdParam) return;
    const appointmentId = Number(appointmentIdParam);
    if (!Number.isFinite(appointmentId) || appointmentId <= 0) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await apiRequest(
          "GET",
          `/api/appointments/${appointmentId}/patient`
        );
        if (!res.ok) {
          let body: any = null;
          try {
            body = await res.json();
          } catch {}
          if (!cancelled) {
            toast({
              title: "Failed to load patient",
              description:
                body?.message ??
                body?.error ??
                `Could not fetch patient for appointment ${appointmentId}.`,
              variant: "destructive",
            });
          }
          return;
        }

        const data = await res.json();
        const patient = data?.patient ?? data;
        if (!cancelled && patient && patient.id) {
          setInitialPatientForModal(patient as Patient);
          setOpenPatientModalFromAppointment(true);

          // remove query param so reload won't re-open
          clearUrlParams(["appointmentId"]);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Error fetching patient for appointment:", err);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location]);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Payments</h1>
          <p className="text-gray-600">
            Manage patient payments and outstanding balances
          </p>
        </div>

        <div className="mt-4 md:mt-0 flex items-center space-x-2">
          <Select
            defaultValue="all-time"
            onValueChange={(value) => setPaymentPeriod(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-time">All Time</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="last-90-days">Last 90 Days</SelectItem>
              <SelectItem value="this-year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Payment Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Outstanding Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 text-yellow-500 mr-2" />
              <div className="text-2xl font-bold">$0</div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              From 0 outstanding invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Payments Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 text-green-500 mr-2" />
              <div className="text-2xl font-bold">${0}</div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              From 0 completed payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Pending Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 text-blue-500 mr-2" />
              <div className="text-2xl font-bold">$0</div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              From 0 pending transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* OCR Image Upload Section*/}
      <PaymentOCRBlock />

      {/* Recent Payments table  */}
      <Card>
        <CardHeader>
          <CardTitle>Payment's Records</CardTitle>
          <CardDescription>
            View and manage all recents patient's claims payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PaymentsRecentTable allowEdit allowDelete />
        </CardContent>
      </Card>

      {/* Recent Payments by Patients*/}
      <PaymentsOfPatientModal
        initialPatient={initialPatientForModal}
        openInitially={openPatientModalFromAppointment}
        onClose={() => {
          // reset the local flags when modal is closed
          setOpenPatientModalFromAppointment(false);
          setInitialPatientForModal(null);
        }}
      />
    </div>
  );
}
