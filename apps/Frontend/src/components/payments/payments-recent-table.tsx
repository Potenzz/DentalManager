import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Edit,
  Eye,
  Delete,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDateToHumanReadable } from "@/utils/dateUtils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Checkbox } from "@/components/ui/checkbox";
import { DeleteConfirmationDialog } from "../ui/deleteDialog";
import PaymentViewModal from "./payment-view-modal";
import PaymentEditModal from "./payment-edit-modal";
import LoadingScreen from "../ui/LoadingScreen";
import {
  ClaimStatus,
  ClaimWithServiceLines,
  Payment,
  PaymentWithExtras,
} from "@repo/db/types";
import EditPaymentModal from "./payment-edit-modal";

interface PaymentApiResponse {
  payments: PaymentWithExtras[];
  totalCount: number;
}

interface PaymentsRecentTableProps {
  allowEdit?: boolean;
  allowView?: boolean;
  allowDelete?: boolean;
  allowCheckbox?: boolean;
  onSelectPayment?: (payment: PaymentWithExtras | null) => void;
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

  const [isViewPaymentOpen, setIsViewPaymentOpen] = useState(false);
  const [isEditPaymentOpen, setIsEditPaymentOpen] = useState(false);
  const [isDeletePaymentOpen, setIsDeletePaymentOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const paymentsPerPage = 5;
  const offset = (currentPage - 1) * paymentsPerPage;

  const [currentPayment, setCurrentPayment] = useState<
    PaymentWithExtras | undefined
  >(undefined);
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(
    null
  );

  const handleSelectPayment = (payment: PaymentWithExtras) => {
    const isSelected = selectedPaymentId === payment.id;
    const newSelectedId = isSelected ? null : payment.id;
    setSelectedPaymentId(Number(newSelectedId));
    if (onSelectPayment) {
      onSelectPayment(isSelected ? null : payment);
    }
  };

  const getPaymentsQueryKey = () =>
    claimId
      ? ["payments-recent", "claim", claimId, currentPage]
      : ["payments-recent", "global", currentPage];

  const {
    data: paymentsData,
    isLoading,
    isError,
  } = useQuery<PaymentApiResponse>({
    queryKey: getPaymentsQueryKey(),
    queryFn: async () => {
      const endpoint = claimId
        ? `/api/payments/claim/${claimId}?limit=${paymentsPerPage}&offset=${offset}`
        : `/api/payments/recent?limit=${paymentsPerPage}&offset=${offset}`;

      const res = await apiRequest("GET", endpoint);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to fetch payments");
      }
      return res.json();
    },
    placeholderData: { payments: [], totalCount: 0 },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: async (payment: PaymentWithExtras) => {
      const response = await apiRequest("PUT", `/api/claims/${payment.id}`, {
        data: payment,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update Payment");
      }
      return response.json();
    },
    onSuccess: () => {
      setIsEditPaymentOpen(false);
      toast({
        title: "Success",
        description: "Payment updated successfully!",
        variant: "default",
      });
      queryClient.invalidateQueries({
        queryKey: getPaymentsQueryKey(),
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Update failed: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/payments/${id}`);
      return;
    },

    onSuccess: () => {
      setIsDeletePaymentOpen(false);
      queryClient.invalidateQueries({
        queryKey: getPaymentsQueryKey(),
      });
      toast({
        title: "Deleted",
        description: "Payment deleted successfully",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete payment: ${error.message})`,
        variant: "destructive",
      });
    },
  });

  const handleEditPayment = (payment: PaymentWithExtras) => {
    setCurrentPayment(payment);
    setIsEditPaymentOpen(true);
  };

  const handleViewPayment = (payment: PaymentWithExtras) => {
    setCurrentPayment(payment);
    setIsViewPaymentOpen(true);
  };

  const handleDeletePayment = (payment: PaymentWithExtras) => {
    setCurrentPayment(payment);
    setIsDeletePaymentOpen(true);
  };

  const handleConfirmDeletePayment = async () => {
    if (currentPayment) {
      if (typeof currentPayment.id === "number") {
        deletePaymentMutation.mutate(currentPayment.id);
      } else {
        toast({
          title: "Error",
          description: "Selected Payment is missing an ID for deletion.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Error",
        description: "No Payment selected for deletion.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (onPageChange) onPageChange(currentPage);
  }, [currentPage, onPageChange]);

  useEffect(() => {
    setCurrentPage(1);
  }, [claimId]);

  const totalPages = useMemo(
    () => Math.ceil((paymentsData?.totalCount || 0) / paymentsPerPage),
    [paymentsData?.totalCount, paymentsPerPage]
  );

  const startItem = offset + 1;
  const endItem = Math.min(
    offset + paymentsPerPage,
    paymentsData?.totalCount || 0
  );

  const getInitialsFromName = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    const filteredParts = parts.filter((part) => part.length > 0);
    if (filteredParts.length === 0) {
      return "";
    }
    const firstInitial = filteredParts[0]!.charAt(0).toUpperCase();
    if (filteredParts.length === 1) {
      return firstInitial;
    } else {
      const lastInitial =
        filteredParts[filteredParts.length - 1]!.charAt(0).toUpperCase();
      return firstInitial + lastInitial;
    }
  };

  const getAvatarColor = (id: number) => {
    const colorClasses = [
      "bg-blue-500",
      "bg-teal-500",
      "bg-amber-500",
      "bg-rose-500",
      "bg-indigo-500",
      "bg-green-500",
      "bg-purple-500",
    ];
    return colorClasses[id % colorClasses.length];
  };

  const getStatusInfo = (status?: ClaimStatus) => {
    switch (status) {
      case "PENDING":
        return {
          label: "Pending",
          color: "bg-yellow-100 text-yellow-800",
          icon: <Clock className="h-3 w-3 mr-1" />,
        };
      case "APPROVED":
        return {
          label: "Approved",
          color: "bg-green-100 text-green-800",
          icon: <CheckCircle className="h-3 w-3 mr-1" />,
        };
      case "CANCELLED":
        return {
          label: "Cancelled",
          color: "bg-red-100 text-red-800",
          icon: <AlertCircle className="h-3 w-3 mr-1" />,
        };
      default:
        return {
          label: status
            ? status.charAt(0).toUpperCase() + status.slice(1)
            : "Unknown",
          color: "bg-gray-100 text-gray-800",
          icon: <AlertCircle className="h-3 w-3 mr-1" />,
        };
    }
  };

  const getTotalBilled = (claim: ClaimWithServiceLines) => {
    return claim.serviceLines.reduce(
      (sum, line) => sum + (line.billedAmount || 0),
      0
    );
  };

  function getPageNumbers(current: number, total: number): (number | "...")[] {
    const delta = 2;
    const range: (number | "...")[] = [];
    const left = Math.max(2, current - delta);
    const right = Math.min(total - 1, current + delta);

    range.push(1);
    if (left > 2) range.push("...");

    for (let i = left; i <= right; i++) {
      range.push(i);
    }

    if (right < total - 1) range.push("...");
    if (total > 1) range.push(total);

    return range;
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {allowCheckbox && <TableHead>Select</TableHead>}
              <TableHead>Payment ID</TableHead>
              <TableHead>Patient Name</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Method</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  <LoadingScreen />
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-red-500"
                >
                  Error loading payments.
                </TableCell>
              </TableRow>
            ) : paymentsData?.payments.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-8 text-muted-foreground"
                >
                  No payments found
                </TableCell>
              </TableRow>
            ) : (
              paymentsData?.payments.map((payment) => {
                const claim = (payment as PaymentWithExtras)
                  .claim as ClaimWithServiceLines;

                const totalBilled = getTotalBilled(claim);

                const totalPaid = (payment as PaymentWithExtras).transactions
                  .flatMap((tx) => tx.serviceLinePayments)
                  .reduce(
                    (sum, sp) => sum + (sp.paidAmount?.toNumber?.() ?? 0),
                    0
                  );

                const outstanding = totalBilled - totalPaid;

                return (
                  <TableRow key={payment.id}>
                    {allowCheckbox && (
                      <TableCell>
                        <Checkbox
                          checked={selectedPaymentId === payment.id}
                          onCheckedChange={() => handleSelectPayment(payment)}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      {typeof payment.id === "number"
                        ? `PAY-${payment.id.toString().padStart(4, "0")}`
                        : "N/A"}
                    </TableCell>
                    <TableCell>{payment.patientName}</TableCell>
                    {/* 💰 Billed / Paid / Due breakdown */}
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span>
                          <strong>Total Billed:</strong> $
                          {totalBilled.toFixed(2)}
                        </span>
                        <span>
                          <strong>Total Paid:</strong> ${totalPaid.toFixed(2)}
                        </span>
                        <span>
                          <strong>Total Due:</strong>{" "}
                          {outstanding > 0 ? (
                            <span className="text-yellow-600">
                              ${outstanding.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-green-600">Settled</span>
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatDateToHumanReadable(payment.paymentDate)}
                    </TableCell>
                    <TableCell>{payment.paymentMethod}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        {allowDelete && (
                          <Button
                            onClick={() => {
                              handleDeletePayment(payment);
                            }}
                            className="text-red-600 hover:text-red-900"
                            aria-label="Delete Staff"
                            variant="ghost"
                            size="icon"
                          >
                            <Delete />
                          </Button>
                        )}
                        {allowEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              handleEditPayment(payment);
                            }}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {allowView && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              handleViewPayment(payment);
                            }}
                            className="text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <DeleteConfirmationDialog
        isOpen={isDeletePaymentOpen}
        onConfirm={handleConfirmDeletePayment}
        onCancel={() => setIsDeletePaymentOpen(false)}
        entityName={String(currentPayment?.claimId)}
      />

      {/* /will hanlde both modal later */}
      {/* {isViewPaymentOpen && currentPayment && (
        <ClaimPaymentModal
          isOpen={isViewPaymentOpen}
          onClose={() => setIsViewPaymentOpen(false)}
          onOpenChange={(open) => setIsViewPaymentOpen(open)}
          onEditClaim={(payment) => handleEditPayment(payment)}
          payment={currentPayment}
        />
      )} */}

      {isEditPaymentOpen && currentPayment && (
        <EditPaymentModal
          isOpen={isEditPaymentOpen}
          onOpenChange={(open) => setIsEditPaymentOpen(open)}
          onClose={() => setIsEditPaymentOpen(false)}
          payment={currentPayment}
          onEditServiceLine={(updatedPayment) => {
            updatePaymentMutation.mutate(updatedPayment);
          }}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground mb-2 sm:mb-0 whitespace-nowrap">
              Showing {startItem}–{endItem} of {paymentsData?.totalCount || 0}{" "}
              results
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
                    className={
                      currentPage === 1 ? "pointer-events-none opacity-50" : ""
                    }
                  />
                </PaginationItem>

                {getPageNumbers(currentPage, totalPages).map((page, idx) => (
                  <PaginationItem key={idx}>
                    {page === "..." ? (
                      <span className="px-2 text-gray-500">...</span>
                    ) : (
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(page as number);
                        }}
                        isActive={currentPage === page}
                      >
                        {page}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages)
                        setCurrentPage(currentPage + 1);
                    }}
                    className={
                      currentPage === totalPages
                        ? "pointer-events-none opacity-50"
                        : ""
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      )}
    </div>
  );
}
