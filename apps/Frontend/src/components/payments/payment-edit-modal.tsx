import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  formatDateToHumanReadable,
  formatLocalDate,
  parseLocalDate,
} from "@/utils/dateUtils";
import React, { useEffect, useState } from "react";
import {
  PaymentStatus,
  PaymentMethod,
  paymentMethodOptions,
  PaymentWithExtras,
  NewTransactionPayload,
  paymentStatusArray,
  paymentMethodArray,
} from "@repo/db/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { X } from "lucide-react";
import { DateInput } from "@/components/ui/dateInput";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

type PaymentEditModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;

  // Keeping callbacks optional — if provided parent handlers will be used
  onEditServiceLine?: (payload: NewTransactionPayload) => void;
  isUpdatingServiceLine?: boolean;

  onUpdateStatus?: (paymentId: number, status: PaymentStatus) => void;
  isUpdatingStatus?: boolean;

  // Either pass a full payment object OR a paymentId (or both)
  payment?: PaymentWithExtras | null;
  paymentId?: number | null;
};

export default function PaymentEditModal({
  isOpen,
  onOpenChange,
  onClose,
  onEditServiceLine,
  isUpdatingServiceLine: propUpdatingServiceLine,
  onUpdateStatus,
  isUpdatingStatus: propUpdatingStatus,
  payment: paymentProp,
  paymentId: paymentIdProp,
}: PaymentEditModalProps) {
  // Local payment state: prefer prop but fetch if paymentId is provided
  const [payment, setPayment] = useState<PaymentWithExtras | null>(
    paymentProp ?? null
  );
  const [loadingPayment, setLoadingPayment] = useState(false);

  // Local update states (used if parent didn't provide flags)
  const [localUpdatingServiceLine, setLocalUpdatingServiceLine] =
    useState(false);
  const [localUpdatingStatus, setLocalUpdatingStatus] = useState(false);

  // derived flags - prefer parent's flags if provided
  const isUpdatingServiceLine =
    propUpdatingServiceLine ?? localUpdatingServiceLine;
  const isUpdatingStatus = propUpdatingStatus ?? localUpdatingStatus;

  // UI state (kept from your original)
  const [expandedLineId, setExpandedLineId] = useState<number | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    (paymentProp ?? null)?.status ?? ("PENDING" as PaymentStatus)
  );

  const [formState, setFormState] = useState(() => {
    return {
      serviceLineId: 0,
      transactionId: "",
      paidAmount: 0,
      adjustedAmount: 0,
      method: paymentMethodOptions.CHECK as PaymentMethod,
      receivedDate: formatLocalDate(new Date()),
      payerName: "",
      notes: "",
    };
  });

  // Sync when parent passes a payment object or paymentId changes
  useEffect(() => {
    // if parent gave a full payment object, use it immediately
    if (paymentProp) {
      setPayment(paymentProp);
      setPaymentStatus(paymentProp.status);
    }
  }, [paymentProp]);

  // Fetch payment when modal opens and we only have paymentId (or payment prop not supplied)
  useEffect(() => {
    if (!isOpen) return;

    // if payment prop is already available, no need to fetch
    if (paymentProp) return;

    const id = paymentIdProp ?? payment?.id;
    if (!id) return;

    let cancelled = false;
    (async () => {
      setLoadingPayment(true);
      try {
        const res = await apiRequest("GET", `/api/payments/${id}`);
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.message ?? `Failed to fetch payment ${id}`);
        }
        const data = await res.json();
        if (!cancelled) {
          setPayment(data as PaymentWithExtras);
          setPaymentStatus((data as PaymentWithExtras).status);
        }
      } catch (err: any) {
        console.error("Failed to fetch payment:", err);
        toast({
          title: "Error",
          description: err?.message ?? "Failed to load payment.",
          variant: "destructive",
        });
      } finally {
        if (!cancelled) setLoadingPayment(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, paymentIdProp]);

  // convenience: get service lines from claim or payment
  const serviceLines =
    payment?.claim?.serviceLines ?? payment?.serviceLines ?? [];

  // small helper to refresh current payment (used after internal writes)
  async function refetchPayment(id?: number) {
    const pid = id ?? payment?.id ?? paymentIdProp;
    if (!pid) return;
    setLoadingPayment(true);
    try {
      const res = await apiRequest("GET", `/api/payments/${pid}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? `Failed to fetch payment ${pid}`);
      }
      const data = await res.json();
      setPayment(data as PaymentWithExtras);
      setPaymentStatus((data as PaymentWithExtras).status);
    } catch (err: any) {
      console.error("Failed to refetch payment:", err);
      toast({
        title: "Error",
        description: err?.message ?? "Failed to refresh payment.",
        variant: "destructive",
      });
    } finally {
      setLoadingPayment(false);
    }
  }

  // Internal save (fallback) — used only when parent didn't provide onEditServiceLine
  const internalUpdatePaymentMutation = useMutation({
    mutationFn: async (data: NewTransactionPayload) => {
      const response = await apiRequest(
        "PUT",
        `/api/payments/${data.paymentId}`,
        {
          data: data,
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update Payment");
      }
      return response.json();
    },
    onSuccess: async (updated, { paymentId }) => {
      toast({
        title: "Success",
        description: "Payment updated successfully!",
      });

      await refetchPayment(paymentId);
    },

    onError: (error) => {
      toast({
        title: "Error",
        description: `Update failed: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const internalUpdatePaymentStatusMutation = useMutation({
    mutationFn: async ({
      paymentId,
      status,
    }: {
      paymentId: number;
      status: PaymentStatus;
    }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/payments/${paymentId}/status`,
        {
          data: { status },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update payment status");
      }

      return response.json();
    },

    onSuccess: async (updated, { paymentId }) => {
      toast({
        title: "Success",
        description: "Payment Status updated successfully!",
      });

      // Fetch updated payment and set into local state
      await refetchPayment(paymentId);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Status update failed: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Keep your existing handlers but route to either parent callback or internal functions
  const handleEditServiceLine = async (payload: NewTransactionPayload) => {
    if (onEditServiceLine) {
      await onEditServiceLine(payload);
    } else {
      // fallback to internal API call
      setLocalUpdatingServiceLine(true);
      await internalUpdatePaymentMutation.mutateAsync(payload);
      setLocalUpdatingServiceLine(false);
    }
  };

  const handleUpdateStatus = async (
    paymentId: number,
    status: PaymentStatus
  ) => {
    if (onUpdateStatus) {
      await onUpdateStatus(paymentId, status);
    } else {
      setLocalUpdatingStatus(true);
      await internalUpdatePaymentStatusMutation.mutateAsync({
        paymentId,
        status,
      });
      setLocalUpdatingStatus(false);
    }
  };

  const handleEditServiceLineClick = (lineId: number) => {
    if (expandedLineId === lineId) {
      // Closing current line
      setExpandedLineId(null);
      return;
    }

    // Find line data
    const line = serviceLines.find((sl) => sl.id === lineId);
    if (!line) return;

    // updating form to show its data, while expanding.
    setFormState({
      serviceLineId: line.id,
      transactionId: "",
      paidAmount: Number(line.totalDue) > 0 ? Number(line.totalDue) : 0,
      adjustedAmount: 0,
      method: paymentMethodOptions.CHECK as PaymentMethod,
      receivedDate: formatLocalDate(new Date()),
      payerName: "",
      notes: "",
    });

    setExpandedLineId(lineId);
  };

  const updateField = (field: string, value: any) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSavePayment = async () => {
    if (!payment) {
      toast({
        title: "Error",
        description: "Payment not loaded.",
        variant: "destructive",
      });
      return;
    }
    if (!formState.serviceLineId) {
      toast({
        title: "Error",
        description: "No service line selected.",
        variant: "destructive",
      });
      return;
    }
    const paidAmount = Number(formState.paidAmount) || 0;
    const adjustedAmount = Number(formState.adjustedAmount) || 0;

    if (paidAmount < 0 || adjustedAmount < 0) {
      toast({
        title: "Invalid Amount",
        description: "Amounts cannot be negative.",
        variant: "destructive",
      });
      return;
    }

    if (paidAmount === 0 && adjustedAmount === 0) {
      toast({
        title: "Invalid Amount",
        description:
          "Either paid or adjusted amount must be greater than zero.",
        variant: "destructive",
      });
      return;
    }

    const line = serviceLines.find((sl) => sl.id === formState.serviceLineId);
    if (!line) {
      toast({
        title: "Error",
        description: "Selected service line not found.",
        variant: "destructive",
      });
      return;
    }

    const dueAmount = Number(line.totalDue);
    if (paidAmount > dueAmount) {
      toast({
        title: "Invalid Payment",
        description: `Paid amount ($${paidAmount.toFixed(
          2
        )}) cannot exceed due amount ($${dueAmount.toFixed(2)}).`,
        variant: "destructive",
      });
      return;
    }

    const payload: NewTransactionPayload = {
      paymentId: payment.id,
      serviceLineTransactions: [
        {
          serviceLineId: formState.serviceLineId,
          transactionId: formState.transactionId || undefined,
          paidAmount: Number(formState.paidAmount),
          adjustedAmount: Number(formState.adjustedAmount) || 0,
          method: formState.method,
          receivedDate: parseLocalDate(formState.receivedDate),
          payerName: formState.payerName?.trim() || undefined,
          notes: formState.notes?.trim() || undefined,
        },
      ],
    };

    try {
      await handleEditServiceLine(payload);
      toast({
        title: "Success",
        description: "Payment Transaction added successfully.",
      });
      setExpandedLineId(null);
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to save payment." });
    }
  };

  const handlePayFullDue = async (line: (typeof serviceLines)[0]) => {
    if (!line || !payment) {
      toast({
        title: "Error",
        description: "Service line or payment data missing.",
        variant: "destructive",
      });
      return;
    }

    const dueAmount = Number(line.totalDue);
    if (isNaN(dueAmount) || dueAmount <= 0) {
      toast({
        title: "No Due",
        description: "This service line has no outstanding balance.",
        variant: "destructive",
      });
      return;
    }

    const payload: NewTransactionPayload = {
      paymentId: payment.id,
      serviceLineTransactions: [
        {
          serviceLineId: line.id,
          paidAmount: dueAmount,
          adjustedAmount: 0,
          method: paymentMethodOptions.CHECK as PaymentMethod, // Maybe make dynamic later
          receivedDate: new Date(),
        },
      ],
    };

    try {
      await handleEditServiceLine(payload);
      toast({
        title: "Success",
        description: `Full due amount ($${dueAmount.toFixed(
          2
        )}) paid for ${line.procedureCode}`,
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to update payment.",
        variant: "destructive",
      });
    }
  };

  if (!payment) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <div className="p-8 text-center">
            {loadingPayment ? "Loading…" : "No payment selected"}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <div className="relative">
          <DialogHeader>
            <DialogTitle>Edit Payment</DialogTitle>
            <DialogDescription>
              View and manage payments applied to service lines.
            </DialogDescription>
          </DialogHeader>

          {/* Close button in top-right */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute right-0 top-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-6">
          {/* Claim + Patient Info */}
          <div className="space-y-2 border-b border-gray-200 pb-4">
            <h3 className="text-2xl font-bold text-gray-900">
              {payment.claim?.patientName ??
                (`${payment.patient?.firstName ?? ""} ${payment.patient?.lastName ?? ""}`.trim() ||
                  "Unknown Patient")}
            </h3>

            <div className="flex flex-wrap items-center gap-3 text-sm">
              {payment.claimId ? (
                <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full font-medium">
                  Claim #{payment.claimId.toString().padStart(4, "0")}
                </span>
              ) : (
                <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full font-medium">
                  OCR Imported Payment
                </span>
              )}
              <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full font-medium">
                Service Date:{" "}
                {payment.claim?.serviceDate
                  ? formatDateToHumanReadable(payment.claim.serviceDate)
                  : serviceLines.length > 0
                    ? formatDateToHumanReadable(serviceLines[0]?.procedureDate)
                    : formatDateToHumanReadable(payment.createdAt)}
              </span>

              {payment.icn ? (
                <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full font-medium">
                  ICN : {payment.icn}
                </span>
              ) : null}
            </div>
          </div>

          {/* Payment Summary + Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Payment Info */}
            <div>
              <h4 className="font-semibold text-gray-900">Payment Info</h4>
              <div className="mt-2 space-y-1 text-sm">
                <p>
                  <span className="text-gray-500">Total Billed:</span>{" "}
                  <span className="font-medium">
                    ${Number(payment.totalBilled || 0).toFixed(2)}
                  </span>
                </p>
                <p>
                  <span className="text-gray-500">Total Paid:</span>{" "}
                  <span className="font-medium text-green-600">
                    ${Number(payment.totalPaid || 0).toFixed(2)}
                  </span>
                </p>
                <p>
                  <span className="text-gray-500">Total Due:</span>{" "}
                  <span className="font-medium text-red-600">
                    ${Number(payment.totalDue || 0).toFixed(2)}
                  </span>
                </p>

                {/* Status Selector */}
                <div className="pt-3">
                  <label className="block text-sm text-gray-600 mb-1">
                    Payment Status
                  </label>
                  <Select
                    value={paymentStatus}
                    onValueChange={(value: PaymentStatus) =>
                      setPaymentStatus(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentStatusArray.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  size="sm"
                  disabled={isUpdatingStatus}
                  onClick={() =>
                    payment && handleUpdateStatus(payment.id, paymentStatus)
                  }
                >
                  {isUpdatingStatus ? "Updating..." : "Update Status"}
                </Button>
              </div>
            </div>

            {/* Metadata */}
            <div>
              <h4 className="font-semibold text-gray-900">Metadata</h4>
              <div className="mt-2 space-y-1 text-sm">
                <p>
                  <span className="text-gray-500">Created At:</span>{" "}
                  {payment.createdAt
                    ? formatDateToHumanReadable(payment.createdAt)
                    : "N/A"}
                </p>
                <p>
                  <span className="text-gray-500">Last Updated At:</span>{" "}
                  {payment.updatedAt
                    ? formatDateToHumanReadable(payment.updatedAt)
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Service Lines Payments */}
          <div>
            <h4 className="font-medium text-gray-900 pt-4">Service Lines</h4>
            <div className="mt-3 space-y-4">
              {serviceLines.length > 0 ? (
                serviceLines.map((line) => {
                  const isExpanded = expandedLineId === line.id;

                  return (
                    <div
                      key={line.id}
                      className="border border-gray-200 p-4 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow duration-200"
                    >
                      {/* Top Info */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <p>
                          <span className="text-gray-500">Procedure Code:</span>{" "}
                          <span className="font-medium">
                            {line.procedureCode}
                          </span>
                        </p>
                        <p>
                          <span className="text-gray-500">Billed:</span>{" "}
                          <span className="font-semibold">
                            ${Number(line.totalBilled || 0).toFixed(2)}
                          </span>
                        </p>
                        <p>
                          <span className="text-gray-500">Paid:</span>{" "}
                          <span className="font-semibold text-green-600">
                            ${Number(line.totalPaid || 0).toFixed(2)}
                          </span>
                        </p>
                        <p>
                          <span className="text-gray-500">Adjusted:</span>{" "}
                          <span className="font-semibold text-yellow-600">
                            ${Number(line.totalAdjusted || 0).toFixed(2)}
                          </span>
                        </p>
                        <p>
                          <span className="text-gray-500">Due:</span>{" "}
                          <span className="font-semibold text-red-600">
                            ${Number(line.totalDue || 0).toFixed(2)}
                          </span>
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-4 flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditServiceLineClick(line.id)}
                        >
                          {isExpanded ? "Cancel" : "Pay Partially"}
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handlePayFullDue(line)}
                        >
                          Pay Full Due
                        </Button>
                      </div>

                      {/* Expanded Partial Payment Form */}
                      {isExpanded && (
                        <div className="mt-4 p-4 border-t border-gray-200 bg-gray-50 rounded-lg space-y-4">
                          <div className="space-y-1">
                            <label className="text-sm font-medium">
                              Paid Amount
                            </label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Paid Amount"
                              defaultValue={formState.paidAmount}
                              onChange={(e) =>
                                updateField(
                                  "paidAmount",
                                  parseFloat(e.target.value)
                                )
                              }
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-sm font-medium">
                              Adjusted Amount
                            </label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Adjusted Amount"
                              defaultValue={formState.adjustedAmount}
                              onChange={(e) =>
                                updateField(
                                  "adjustedAmount",
                                  parseFloat(e.target.value)
                                )
                              }
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-sm font-medium">
                              Payment Method
                            </label>
                            <Select
                              value={formState.method}
                              onValueChange={(value: PaymentMethod) =>
                                setFormState((prev) => ({
                                  ...prev,
                                  method: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a payment method" />
                              </SelectTrigger>
                              <SelectContent>
                                {paymentMethodArray.map((methodOption) => (
                                  <SelectItem
                                    key={methodOption}
                                    value={methodOption}
                                  >
                                    {methodOption}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <DateInput
                            label="Received Date"
                            value={
                              formState.receivedDate
                                ? parseLocalDate(formState.receivedDate)
                                : null
                            }
                            onChange={(date) => {
                              if (date) {
                                const localDate = formatLocalDate(date);
                                updateField("receivedDate", localDate);
                              } else {
                                updateField("receivedDate", null);
                              }
                            }}
                            disableFuture
                          />

                          <div className="space-y-1">
                            <label className="text-sm font-medium">
                              Payer Name
                            </label>
                            <Input
                              type="text"
                              placeholder="Payer Name"
                              value={formState.payerName}
                              onChange={(e) =>
                                updateField("payerName", e.target.value)
                              }
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-sm font-medium">Notes</label>
                            <Input
                              type="text"
                              placeholder="Notes"
                              onChange={(e) =>
                                updateField("notes", e.target.value)
                              }
                            />
                          </div>

                          <Button
                            size="sm"
                            disabled={isUpdatingServiceLine}
                            onClick={() => handleSavePayment()}
                          >
                            {isUpdatingStatus ? "Updating..." : "Update"}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500">No service lines available.</p>
              )}
            </div>
          </div>

          {/* Transactions Overview */}
          <div>
            <h4 className="font-medium text-gray-900 pt-6">All Transactions</h4>
            <div className="mt-4 space-y-3">
              {payment.serviceLineTransactions.length > 0 ? (
                payment.serviceLineTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="border border-gray-200 p-4 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                      {/* Transaction ID */}
                      {tx.id && (
                        <p>
                          <span className="text-gray-500">Transaction ID:</span>{" "}
                          <span className="font-medium">{tx.id}</span>
                        </p>
                      )}

                      {/* Procedure Code */}
                      {tx.serviceLine?.procedureCode && (
                        <p>
                          <span className="text-gray-500">Procedure Code:</span>{" "}
                          <span className="font-medium">
                            {tx.serviceLine.procedureCode}
                          </span>
                        </p>
                      )}

                      {/* Paid Amount */}
                      <p>
                        <span className="text-gray-500">Paid Amount:</span>{" "}
                        <span className="font-semibold text-green-600">
                          ${Number(tx.paidAmount).toFixed(2)}
                        </span>
                      </p>

                      {/* Adjusted Amount */}
                      {Number(tx.adjustedAmount) > 0 && (
                        <p>
                          <span className="text-gray-500">
                            Adjusted Amount:
                          </span>{" "}
                          <span className="font-semibold text-yellow-600">
                            ${Number(tx.adjustedAmount).toFixed(2)}
                          </span>
                        </p>
                      )}

                      {/* Date */}
                      <p>
                        <span className="text-gray-500">Date:</span>{" "}
                        <span>
                          {formatDateToHumanReadable(tx.receivedDate)}
                        </span>
                      </p>

                      {/* Method */}
                      <p>
                        <span className="text-gray-500">Method:</span>{" "}
                        <span className="capitalize">{tx.method}</span>
                      </p>

                      {/* Payer Name */}
                      {tx.payerName && tx.payerName.trim() !== "" && (
                        <p className="md:col-span-2">
                          <span className="text-gray-500">Payer Name:</span>{" "}
                          <span>{tx.payerName}</span>
                        </p>
                      )}

                      {/* Notes */}
                      {tx.notes && tx.notes.trim() !== "" && (
                        <p className="md:col-span-2">
                          <span className="text-gray-500">Notes:</span>{" "}
                          <span>{tx.notes}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No transactions recorded.</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-6">
            <Button variant="default" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
