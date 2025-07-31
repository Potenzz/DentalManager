import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDateToHumanReadable } from "@/utils/dateUtils";
import { z } from "zod";
import { PaymentUncheckedCreateInputObjectSchema } from "@repo/db/usedSchemas";

type Payment = z.infer<typeof PaymentUncheckedCreateInputObjectSchema>;

interface PaymentViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment;
}

export default function PaymentViewModal({ isOpen, onClose, payment }: PaymentViewModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Payment Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div><strong>Payment ID:</strong> PAY-{payment.id.toString().padStart(4, "0")}</div>
          <div><strong>Claim ID:</strong> {payment.claimId}</div>
          <div><strong>Payer Name:</strong> {payment.payerName}</div>
          <div><strong>Amount Paid:</strong> ${payment.amountPaid.toFixed(2)}</div>
          <div><strong>Payment Date:</strong> {formatDateToHumanReadable(payment.paymentDate)}</div>
          <div><strong>Payment Method:</strong> {payment.paymentMethod}</div>
          <div><strong>Note:</strong> {payment.note || "—"}</div>
          <div><strong>Created At:</strong> {formatDateToHumanReadable(payment.createdAt)}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
