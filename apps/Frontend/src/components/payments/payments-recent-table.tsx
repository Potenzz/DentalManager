import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Eye, Delete } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDateToHumanReadable } from "@/utils/dateUtils";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Checkbox } from "@/components/ui/checkbox";
import { PaymentUncheckedCreateInputObjectSchema, PaymentTransactionCreateInputObjectSchema, ServiceLinePaymentCreateInputObjectSchema } from "@repo/db/usedSchemas";
import { z } from "zod";
import { DeleteConfirmationDialog } from "../ui/deleteDialog";
import PaymentViewModal from "./payment-view-modal";
import PaymentEditModal from "./payment-edit-modal";

type Payment = z.infer<typeof PaymentUncheckedCreateInputObjectSchema>;
type PaymentTransaction = z.infer<
  typeof PaymentTransactionCreateInputObjectSchema
>;
type ServiceLinePayment = z.infer<
  typeof ServiceLinePaymentCreateInputObjectSchema
>;

const insertPaymentSchema = (
  PaymentUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
type InsertPayment = z.infer<typeof insertPaymentSchema>;

const updatePaymentSchema = (
  PaymentUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
)
  .omit({
    id: true,
    createdAt: true,
  })
  .partial();
type UpdatePayment = z.infer<typeof updatePaymentSchema>;

type PaymentWithExtras = Prisma.PaymentGetPayload<{
  include: {
    transactions: true;
    servicePayments: true;
    claim: true;
  };
}>;

interface PaymentApiResponse {
  payments: Payment[];
  totalCount: number;
}


interface PaymentsRecentTableProps {
  allowEdit?: boolean;
  allowView?: boolean;
  allowDelete?: boolean;
  allowCheckbox?: boolean;
  onSelectPayment?: (payment: Payment | null) => void;
  onPageChange?: (page: number) => void;
  claimId?: number;
}

export default function PaymentsRecentTable({
  allowEdit,
  allowView,
  allowDelete,
  allowCheckbox,
  onSelectPayment,
  onPageChange,
  claimId,
}: PaymentsRecentTableProps) {
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const paymentsPerPage = 5;
  const offset = (currentPage - 1) * paymentsPerPage;

  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);
  const [currentPayment, setCurrentPayment] = useState<Payment | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const getQueryKey = () =>
    claimId
      ? ["payments", "claim", claimId, currentPage]
      : ["payments", "recent", currentPage];

  const {
    data: paymentsData,
    isLoading,
    isError,
  } = useQuery<PaymentApiResponse>({
    queryKey: getQueryKey(),
    queryFn: async () => {
      const endpoint = claimId
        ? `/api/payments/claim/${claimId}?limit=${paymentsPerPage}&offset=${offset}`
        : `/api/payments/recent?limit=${paymentsPerPage}&offset=${offset}`;

      const res = await apiRequest("GET", endpoint);
      if (!res.ok) throw new Error("Failed to fetch payments");
      return res.json();
    },
    placeholderData: { payments: [], totalCount: 0 },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/payments/${id}`);
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      toast({ title: "Deleted", description: "Payment deleted successfully" });
      setIsDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: getQueryKey() });
    },
    onError: () => {
      toast({ title: "Error", description: "Delete failed", variant: "destructive" });
    },
  });

  const handleSelectPayment = (payment: Payment) => {
    const isSelected = selectedPaymentId === payment.id;
    const newSelectedId = isSelected ? null : payment.id;
    setSelectedPaymentId(newSelectedId);
    onSelectPayment?.(isSelected ? null : payment);
  };

  const handleDelete = () => {
    if (currentPayment?.id) {
      deleteMutation.mutate(currentPayment.id);
    }
  };

  useEffect(() => {
    onPageChange?.(currentPage);
  }, [currentPage]);

  const totalPages = useMemo(
    () => Math.ceil((paymentsData?.totalCount || 0) / paymentsPerPage),
    [paymentsData]
  );

  return (
    <div className="bg-white rounded shadow">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {allowCheckbox && <TableHead>Select</TableHead>}
              <TableHead>Payment ID</TableHead>
              <TableHead>Payer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Note</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6">Loading...</TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-red-500 py-6">Error loading payments</TableCell>
              </TableRow>
            ) : paymentsData?.payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No payments found</TableCell>
              </TableRow>
            ) : (
              paymentsData?.payments.map((payment) => (
                <TableRow key={payment.id}>
                  {allowCheckbox && (
                    <TableCell>
                      <Checkbox
                        checked={selectedPaymentId === payment.id}
                        onCheckedChange={() => handleSelectPayment(payment)}
                      />
                    </TableCell>
                  )}
                  <TableCell>{`PAY-${payment.id.toString().padStart(4, "0")}`}</TableCell>
                  <TableCell>{payment.payerName}</TableCell>
                  <TableCell>${payment.amountPaid.toFixed(2)}</TableCell>
                  <TableCell>{formatDateToHumanReadable(payment.paymentDate)}</TableCell>
                  <TableCell>{payment.paymentMethod}</TableCell>
                  <TableCell>{payment.note || "—"}</TableCell>
                  <TableCell className="text-right space-x-2">
                    {allowDelete && (
                      <Button variant="ghost" size="icon" onClick={() => { setCurrentPayment(payment); setIsDeleteOpen(true); }}>
                        <Delete className="text-red-600" />
                      </Button>
                    )}
                    {allowEdit && (
                      <Button variant="ghost" size="icon" onClick={() => { setCurrentPayment(payment); setIsEditOpen(true); }}>
                        <Edit />
                      </Button>
                    )}
                    {allowView && (
                      <Button variant="ghost" size="icon" onClick={() => { setCurrentPayment(payment); setIsViewOpen(true); }}>
                        <Eye />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-2 border-t flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {(offset + 1)}–{Math.min(offset + paymentsPerPage, paymentsData?.totalCount || 0)} of {paymentsData?.totalCount || 0}
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage > 1) setCurrentPage(currentPage - 1);
                  }}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }).map((_, i) => (
                <PaginationItem key={i}>
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage(i + 1);
                    }}
                    isActive={currentPage === i + 1}
                  >
                    {i + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                  }}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Modals */}
      {isViewOpen && currentPayment && (
        <PaymentViewModal
          isOpen={isViewOpen}
          onClose={() => setIsViewOpen(false)}
          payment={currentPayment}
        />
      )}

      {isEditOpen && currentPayment && (
        <PaymentEditModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          payment={currentPayment}
          onSave={() => {
            queryClient.invalidateQueries({ queryKey: getQueryKey() });
          }}
        />
      )}

      <DeleteConfirmationDialog
        isOpen={isDeleteOpen}
        onCancel={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        entityName={`Payment ${currentPayment?.id}`}
      />
    </div>
  );
}
