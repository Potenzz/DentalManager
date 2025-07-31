import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { format } from "date-fns";
import { PaymentUncheckedCreateInputObjectSchema } from "@repo/db/usedSchemas";

type Payment = z.infer<typeof PaymentUncheckedCreateInputObjectSchema>;

interface PaymentEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment;
  onSave: () => void;
}

export default function PaymentEditModal({
  isOpen,
  onClose,
  payment,
  onSave,
}: PaymentEditModalProps) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    payerName: payment.payerName,
    amountPaid: payment.amountPaid.toString(),
    paymentDate: format(new Date(payment.paymentDate), "yyyy-MM-dd"),
    paymentMethod: payment.paymentMethod,
    note: payment.note || "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await apiRequest("PUT", `/api/payments/${payment.id}`, {
        ...form,
        amountPaid: parseFloat(form.amountPaid),
        paymentDate: new Date(form.paymentDate),
      });

      if (!res.ok) throw new Error("Failed to update payment");

      toast({ title: "Success", description: "Payment updated successfully" });
      queryClient.invalidateQueries();
      onClose();
      onSave();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update payment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="payerName">Payer Name</Label>
            <Input
              id="payerName"
              name="payerName"
              value={form.payerName}
              onChange={handleChange}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="amountPaid">Amount Paid</Label>
            <Input
              id="amountPaid"
              name="amountPaid"
              type="number"
              step="0.01"
              value={form.amountPaid}
              onChange={handleChange}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="paymentDate">Payment Date</Label>
            <Input
              id="paymentDate"
              name="paymentDate"
              type="date"
              value={form.paymentDate}
              onChange={handleChange}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Input
              id="paymentMethod"
              name="paymentMethod"
              value={form.paymentMethod}
              onChange={handleChange}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              name="note"
              value={form.note}
              onChange={handleChange}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
