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
} from "@radix-ui/react-select";
import { Input } from "@/components/ui/input";
import Decimal from "decimal.js";
import { toast } from "@/hooks/use-toast";

type PaymentEditModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  onEditServiceLine: (payload: NewTransactionPayload) => void;
  payment: PaymentWithExtras | null;
};

export default function PaymentEditModal({
  isOpen,
  onOpenChange,
  onClose,
  payment,
  onEditServiceLine,
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

  const handleEditServiceLine = (lineId: number) => {
    if (expandedLineId === lineId) {
      // Closing current line
      setExpandedLineId(null);
      return;
    }

    // Find line data
    const line = payment.claim.serviceLines.find((sl) => sl.id === lineId);
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
      toast({ title: "Error", description: "No service line selected." });
      return;
    }

    const payload: NewTransactionPayload = {
      paymentId: payment.id,
      status: paymentStatus,
      serviceLineTransactions: [
        {
          serviceLineId: formState.serviceLineId,
          transactionId: formState.transactionId || undefined,
          paidAmount: Number(formState.paidAmount),
          adjustedAmount: Number(formState.adjustedAmount) || 0,
          method: formState.method,
          receivedDate: parseLocalDate(formState.receivedDate),
          payerName: formState.payerName || undefined,
          notes: formState.notes || undefined,
        },
      ],
    };

    try {
      await onEditServiceLine(payload);
      setExpandedLineId(null);
      onClose();
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to save payment." });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Payment</DialogTitle>
          <DialogDescription>
            View and manage payments applied to service lines.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Claim + Patient Info */}
          <div className="space-y-1">
            <h3 className="text-xl font-semibold">
              {payment.claim.patientName}
            </h3>
            <p className="text-gray-500">
              Claim ID: {payment.claimId.toString().padStart(4, "0")}
            </p>
            <p className="text-gray-500">
              Service Date:{" "}
              {formatDateToHumanReadable(payment.claim.serviceDate)}
            </p>
            <p>
              <span className="text-gray-500">Notes:</span>{" "}
              {payment.notes || "N/A"}
            </p>
          </div>

          {/* Payment Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <h4 className="font-medium text-gray-900">Payment Info</h4>
              <div className="mt-2 space-y-1">
                <p>
                  <span className="text-gray-500">Total Billed:</span> $
                  {payment.totalBilled.toNumber().toFixed(2)}
                </p>
                <p>
                  <span className="text-gray-500">Total Paid:</span> $
                  {payment.totalPaid.toNumber().toFixed(2)}
                </p>
                <p>
                  <span className="text-gray-500">Total Due:</span> $
                  {payment.totalDue.toNumber().toFixed(2)}
                </p>
                <div className="pt-2">
                  <label className="text-sm text-gray-600">Status</label>
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
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900">Metadata</h4>
              <div className="mt-2 space-y-1">
                <p>
                  <span className="text-gray-500">Created At:</span>{" "}
                  {payment.createdAt
                    ? formatDateToHumanReadable(payment.createdAt)
                    : "N/A"}
                </p>
                <p>
                  <span className="text-gray-500">Last Upadated At:</span>{" "}
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
            <div className="mt-2 space-y-3">
              {payment.claim.serviceLines.length > 0 ? (
                <>
                  {payment.claim.serviceLines.map((line) => {
                    return (
                      <div
                        key={line.id}
                        className="border p-3 rounded-md bg-gray-50"
                      >
                        <p>
                          <span className="text-gray-500">Procedure Code:</span>{" "}
                          {line.procedureCode}
                        </p>
                        <p>
                          <span className="text-gray-500">Billed:</span> $
                          {line.totalBilled.toFixed(2)}
                        </p>
                        <p>
                          <span className="text-gray-500">Paid:</span> $
                          {line.totalPaid.toFixed(2)}
                        </p>
                        <p>
                          <span className="text-gray-500">Adjusted:</span> $
                          {line.totalAdjusted.toFixed(2)}
                        </p>
                        <p>
                          <span className="text-gray-500">Due:</span> $
                          {line.totalDue.toFixed(2)}
                        </p>

                        <div className="pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditServiceLine(line.id)}
                          >
                            {expandedLineId === line.id
                              ? "Cancel"
                              : "Edit Payments"}
                          </Button>
                        </div>

                        {expandedLineId === line.id && (
                          <div className="mt-3 space-y-2">
                            <div className="space-y-1">
                              <label
                                htmlFor={`paid-${line.id}`}
                                className="text-sm font-medium"
                              >
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
                              <label
                                htmlFor={`adjusted-${line.id}`}
                                className="text-sm font-medium"
                              >
                                Adjusted Amount
                              </label>
                              <Input
                                id={`adjusted-${line.id}`}
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
                                  updateField("method", value)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
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

                            <div className="space-y-1">
                              <label className="text-sm font-medium">
                                Received Date
                              </label>
                              <Input
                                type="date"
                                value={formState.receivedDate}
                                onChange={(e) =>
                                  updateField("receivedDate", e.target.value)
                                }
                              />
                            </div>

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
                              <label
                                htmlFor={`notes-${line.id}`}
                                className="text-sm font-medium"
                              >
                                Notes
                              </label>
                              <Input
                                id={`notes-${line.id}`}
                                type="text"
                                placeholder="Notes"
                                onChange={(e) =>
                                  updateField("notes", e.target.value)
                                }
                              />
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleSavePayment()}
                            >
                              Save
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              ) : (
                <p className="text-gray-500">No service lines available.</p>
              )}
            </div>
          </div>

          {/* Transactions Overview */}
          <div>
            <h4 className="font-medium text-gray-900 pt-6">All Transactions</h4>
            <div className="mt-2 space-y-2">
              {payment.serviceLineTransactions.length > 0 ? (
                payment.serviceLineTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="border p-3 rounded-md bg-white shadow-sm"
                  >
                    <p>
                      <span className="text-gray-500">Date:</span>{" "}
                      {formatDateToHumanReadable(tx.receivedDate)}
                    </p>
                    <p>
                      <span className="text-gray-500">Paid Amount:</span> $
                      {Number(tx.paidAmount).toFixed(2)}
                    </p>
                    <p>
                      <span className="text-gray-500">Adjusted Amount:</span> $
                      {Number(tx.adjustedAmount).toFixed(2)}
                    </p>
                    <p>
                      <span className="text-gray-500">Method:</span> {tx.method}
                    </p>
                    {tx.payerName && (
                      <p>
                        <span className="text-gray-500">Payer Name:</span>{" "}
                        {tx.payerName}
                      </p>
                    )}
                    {tx.notes && (
                      <p>
                        <span className="text-gray-500">Notes:</span> {tx.notes}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No transactions recorded.</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-6">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
