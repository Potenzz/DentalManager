import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatDateToHumanReadable } from "@/utils/dateUtils";
import React, { useState } from "react";
import { paymentStatusOptions, PaymentWithExtras } from "@repo/db/types";
import { PaymentStatus, PaymentMethod } from "@repo/db/types";

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
  onEditServiceLine: (updatedPayment: PaymentWithExtras) => void;
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
  const [updatedPaidAmounts, setUpdatedPaidAmounts] = useState<
    Record<number, number>
  >({});
  const [updatedAdjustedAmounts, setUpdatedAdjustedAmounts] = useState<
    Record<number, number>
  >({});
  const [updatedNotes, setUpdatedNotes] = useState<Record<number, string>>({});
  const [updatedPaymentStatus, setUpdatedPaymentStatus] =
    useState<PaymentStatus>(payment?.status ?? "PENDING");
  const [updatedTransactions, setUpdatedTransactions] = useState(
    () => payment?.transactions ?? []
  );

    type DraftPaymentData = {
    paidAmount: number;
    adjustedAmount?: number;
    notes?: string;
    paymentStatus?: PaymentStatus;
    payerName?: string;
    method: PaymentMethod;
    receivedDate: string;
  };

  

  const [serviceLineDrafts, setServiceLineDrafts] = useState<Record<number, any>>({});


  const totalPaid = payment.transactions.reduce(
    (sum, tx) =>
      sum +
      tx.serviceLinePayments.reduce((s, sp) => s + Number(sp.paidAmount), 0),
    0
  );

  const totalBilled = payment.claim.serviceLines.reduce(
    (sum, line) => sum + line.billedAmount,
    0
  );

  const totalDue = totalBilled - totalPaid;

  const handleEditServiceLine = (lineId: number) => {
    setExpandedLineId(lineId === expandedLineId ? null : lineId);
  };

  const handleFieldChange = (lineId: number, field: string, value: any) => {
    setServiceLineDrafts((prev) => ({
      ...prev,
      [lineId]: {
        ...prev[lineId],
        [field]: value,
      },
    }));
  };

  // const handleSavePayment = (lineId: number) => {
  //   const newPaidAmount = updatedPaidAmounts[lineId];
  //   const newAdjustedAmount = updatedAdjustedAmounts[lineId] ?? 0;
  //   const newNotes = updatedNotes[lineId] ?? "";

  //   if (newPaidAmount == null || isNaN(newPaidAmount)) return;

  //   const updatedTxs = updatedTransactions.map((tx) => ({
  //     ...tx,
  //     serviceLinePayments: tx.serviceLinePayments.map((sp) =>
  //       sp.serviceLineId === lineId
  //         ? {
  //             ...sp,
  //             paidAmount: new Decimal(newPaidAmount),
  //             adjustedAmount: new Decimal(newAdjustedAmount),
  //             notes: newNotes,
  //           }
  //         : sp
  //     ),
  //   }));

  //   const updatedPayment: PaymentWithExtras = {
  //     ...payment,
  //     transactions: updatedTxs,
  //     status: updatedPaymentStatus,
  //   };

  //   setUpdatedTransactions(updatedTxs);
  //   onEditServiceLine(updatedPayment);
  //   setExpandedLineId(null);
  // };

  const handleSavePayment = async (lineId: number) => {
    const data = serviceLineDrafts[lineId];
    if (!data || !data.paidAmount || !data.method || !data.receivedDate) {
      console.log("please fill al")
      return;
    }

    const transactionPayload = {
      paymentId: payment.id,
      amount: data.paidAmount + (data.adjustedAmount ?? 0),
      method: data.method,
      payerName: data.payerName,
      notes: data.notes,
      receivedDate: new Date(data.receivedDate),
      serviceLinePayments: [
        {
          serviceLineId: lineId,
          paidAmount: data.paidAmount,
          adjustedAmount: data.adjustedAmount ?? 0,
          notes: data.notes,
        },
      ],
    };

    try {
      await onEditServiceLine(transactionPayload);
      setExpandedLineId(null);
      onClose();
    } catch (err) {
      console.log(err)
    }
  };


  const renderInput = (label: string, type: string, lineId: number, field: string, step?: string) => (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <Input
        type={type}
        step={step}
        value={serviceLineDrafts[lineId]?.[field] ?? ""}
        onChange={(e) =>
          handleFieldChange(lineId, field, type === "number" ? parseFloat(e.target.value) : e.target.value)
        }
      />
    </div>
  );


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
          </div>

          {/* Payment Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <h4 className="font-medium text-gray-900">Payment Info</h4>
              <div className="mt-2 space-y-1">
                <p>
                  <span className="text-gray-500">Total Billed:</span> $
                  {totalBilled.toFixed(2)}
                </p>
                <p>
                  <span className="text-gray-500">Total Paid:</span> $
                  {totalPaid.toFixed(2)}
                </p>
                <p>
                  <span className="text-gray-500">Total Due:</span> $
                  {totalDue.toFixed(2)}
                </p>
                <div className="pt-2">
                  <label className="text-sm text-gray-600">Status</label>
                  <Select
                    value={updatedPaymentStatus}
                    onValueChange={(value: PaymentStatus) =>
                      setUpdatedPaymentStatus(value)
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
                  <span className="text-gray-500">Received Date:</span>{" "}
                  {payment.receivedDate
                    ? formatDateToHumanReadable(payment.receivedDate)
                    : "N/A"}
                </p>
                <p>
                  <span className="text-gray-500">Method:</span>{" "}
                  {payment.paymentMethod ?? "N/A"}
                </p>
                <p>
                  <span className="text-gray-500">Notes:</span>{" "}
                  {payment.notes || "N/A"}
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
                    const linePayments = payment.transactions.flatMap((tx) =>
                      tx.serviceLinePayments.filter(
                        (sp) => sp.serviceLineId === line.id
                      )
                    );

                    const paidAmount = linePayments.reduce(
                      (sum, sp) => sum + Number(sp.paidAmount),
                      0
                    );
                    const adjusted = linePayments.reduce(
                      (sum, sp) => sum + Number(sp.adjustedAmount),
                      0
                    );
                    const due = line.billedAmount - paidAmount;

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
                          {line.billedAmount.toFixed(2)}
                        </p>
                        <p>
                          <span className="text-gray-500">Paid:</span> $
                          {paidAmount.toFixed(2)}
                        </p>
                        <p>
                          <span className="text-gray-500">Adjusted:</span> $
                          {adjusted.toFixed(2)}
                        </p>
                        <p>
                          <span className="text-gray-500">Due:</span> $
                          {due.toFixed(2)}
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
                                defaultValue={paidAmount}
                                onChange={(e) =>
                                  setUpdatedPaidAmounts({
                                    ...updatedPaidAmounts,
                                    [line.id]: parseFloat(e.target.value),
                                  })
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
                                defaultValue={adjusted}
                                onChange={(e) =>
                                  setUpdatedAdjustedAmounts({
                                    ...updatedAdjustedAmounts,
                                    [line.id]: parseFloat(e.target.value),
                                  })
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
                                  setUpdatedNotes({
                                    ...updatedNotes,
                                    [line.id]: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleSavePayment(line.id)}
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
              {payment.transactions.length > 0 ? (
                payment.transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="border p-3 rounded-md bg-white shadow-sm"
                  >
                    <p>
                      <span className="text-gray-500">Date:</span>{" "}
                      {formatDateToHumanReadable(tx.receivedDate)}
                    </p>
                    <p>
                      <span className="text-gray-500">Amount:</span> $
                      {Number(tx.amount).toFixed(2)}
                    </p>
                    <p>
                      <span className="text-gray-500">Method:</span> {tx.method}
                    </p>
                    {tx.serviceLinePayments.map((sp) => (
                      <p key={sp.id} className="text-sm text-gray-600 ml-2">
                        • Applied ${Number(sp.paidAmount).toFixed(2)} to service
                        line ID {sp.serviceLineId}
                      </p>
                    ))}
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
