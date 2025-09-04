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
import React, { useState } from "react";
import {
  PaymentStatus,
  paymentStatusOptions,
  PaymentMethod,
  paymentMethodOptions,
  PaymentWithExtras,
  NewTransactionPayload,
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

type PaymentEditModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  onEditServiceLine: (payload: NewTransactionPayload) => void;
  isUpdatingServiceLine?: boolean;
  onUpdateStatus: (paymentId: number, status: PaymentStatus) => void;
  isUpdatingStatus?: boolean;
  payment: PaymentWithExtras | null;
};

export default function PaymentEditModal({
  isOpen,
  onOpenChange,
  onClose,
  payment,
  onEditServiceLine,
  isUpdatingServiceLine,
  onUpdateStatus,
  isUpdatingStatus,
}: PaymentEditModalProps) {
  if (!payment) return null;

  const [expandedLineId, setExpandedLineId] = useState<number | null>(null);
  const [paymentStatus, setPaymentStatus] = React.useState<PaymentStatus>(
    payment.status
  );
  const [formState, setFormState] = useState(() => {
    return {
      serviceLineId: 0,
      transactionId: "",
      paidAmount: 0,
      adjustedAmount: 0,
      method: paymentMethodOptions[1] as PaymentMethod,
      receivedDate: formatLocalDate(new Date()),
      payerName: "",
      notes: "",
    };
  });

  const serviceLines =
    payment.claim?.serviceLines ?? payment.serviceLines ?? [];

  const handleEditServiceLine = (lineId: number) => {
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
      method: paymentMethodOptions[1] as PaymentMethod,
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
      await onEditServiceLine(payload);
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
          method: paymentMethodOptions[1] as PaymentMethod, // Maybe make dynamic later
          receivedDate: new Date(),
        },
      ],
    };

    try {
      await onEditServiceLine(payload);
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
                      {paymentStatusOptions.map((status) => (
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
                    payment && onUpdateStatus(payment.id, paymentStatus)
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
                          onClick={() => handleEditServiceLine(line.id)}
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
                                {paymentMethodOptions.map((methodOption) => (
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
