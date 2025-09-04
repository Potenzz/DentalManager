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
  TrendingUp,
  ThumbsDown,
  DollarSign,
  Ban,
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
import LoadingScreen from "../ui/LoadingScreen";
import {
  NewTransactionPayload,
  PaymentStatus,
  PaymentWithExtras,
} from "@repo/db/types";
import EditPaymentModal from "./payment-edit-modal";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ConfirmationDialog } from "../ui/confirmationDialog";

interface PaymentApiResponse {
  payments: PaymentWithExtras[];
  totalCount: number;
}

interface PaymentsRecentTableProps {
  allowEdit?: boolean;
  allowDelete?: boolean;
  allowCheckbox?: boolean;
  onSelectPayment?: (payment: PaymentWithExtras | null) => void;
  onPageChange?: (page: number) => void;
  patientId?: number;
}

export default function PaymentsRecentTable({
  allowEdit,
  allowDelete,
  allowCheckbox,
  onSelectPayment,
  onPageChange,
  patientId,
}: PaymentsRecentTableProps) {
  const { toast } = useToast();

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

  const [isRevertOpen, setIsRevertOpen] = useState(false);
  const [revertPaymentId, setRevertPaymentId] = useState<number | null>(null);

  const handleSelectPayment = (payment: PaymentWithExtras) => {
    const isSelected = selectedPaymentId === payment.id;
    const newSelectedId = isSelected ? null : payment.id;
    setSelectedPaymentId(Number(newSelectedId));
    if (onSelectPayment) {
      onSelectPayment(isSelected ? null : payment);
    }
  };

  const getPaymentsQueryKey = () =>
    patientId
      ? ["payments-recent", "patient", patientId, currentPage]
      : ["payments-recent", "global", currentPage];

  const {
    data: paymentsData,
    isLoading,
    isError,
  } = useQuery<PaymentApiResponse>({
    queryKey: getPaymentsQueryKey(),
    queryFn: async () => {
      const endpoint = patientId
        ? `/api/payments/patient/${patientId}?limit=${paymentsPerPage}&offset=${offset}`
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

      queryClient.invalidateQueries({
        queryKey: getPaymentsQueryKey(),
      });

      // Fetch updated payment and set into local state
      const refreshedPayment = await apiRequest(
        "GET",
        `/api/payments/${paymentId}`
      ).then((res) => res.json());

      setCurrentPayment(refreshedPayment); // <-- keep modal in sync
    },

    onError: (error) => {
      toast({
        title: "Error",
        description: `Update failed: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updatePaymentStatusMutation = useMutation({
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

      queryClient.invalidateQueries({
        queryKey: getPaymentsQueryKey(),
      });

      // Fetch updated payment and set into local state
      const refreshedPayment = await apiRequest(
        "GET",
        `/api/payments/${paymentId}`
      ).then((res) => res.json());

      setCurrentPayment(refreshedPayment); // <-- keep modal in sync
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Status update failed: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const fullPaymentMutation = useMutation({
    mutationFn: async ({
      paymentId,
      type,
    }: {
      paymentId: number;
      type: "pay" | "revert";
    }) => {
      const endpoint =
        type === "pay"
          ? `/api/payments/${paymentId}/pay-absolute-full-claim`
          : `/api/payments/${paymentId}/revert-full-claim`;
      const response = await apiRequest("PUT", endpoint);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update Payment");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Payment updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: getPaymentsQueryKey() });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Operation failed: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handlePayAbsoluteFullDue = (paymentId: number) => {
    fullPaymentMutation.mutate({ paymentId, type: "pay" });
  };

  const handleRevert = () => {
    if (!revertPaymentId) return;

    fullPaymentMutation.mutate({
      paymentId: revertPaymentId,
      type: "revert",
    });

    setRevertPaymentId(null);
    setIsRevertOpen(false);
  };

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

  //VOID and UNVOID Feature
  const handleVoid = (paymentId: number) => {
    updatePaymentStatusMutation.mutate({ paymentId, status: "VOID" });
  };

  const handleUnvoid = (paymentId: number) => {
    updatePaymentStatusMutation.mutate({ paymentId, status: "PENDING" });
  };

  const [isVoidOpen, setIsVoidOpen] = useState(false);
  const [voidPaymentId, setVoidPaymentId] = useState<number | null>(null);

  const [isUnvoidOpen, setIsUnvoidOpen] = useState(false);
  const [unvoidPaymentId, setUnvoidPaymentId] = useState<number | null>(null);

  const handleConfirmVoid = () => {
    if (!voidPaymentId) return;
    handleVoid(voidPaymentId);
    setVoidPaymentId(null);
    setIsVoidOpen(false);
  };

  const handleConfirmUnvoid = () => {
    if (!unvoidPaymentId) return;
    handleUnvoid(unvoidPaymentId);
    setUnvoidPaymentId(null);
    setIsUnvoidOpen(false);
  };

  // Pagination
  useEffect(() => {
    if (onPageChange) onPageChange(currentPage);
  }, [currentPage, onPageChange]);

  useEffect(() => {
    setCurrentPage(1);
  }, [patientId]);

  const totalPages = useMemo(
    () => Math.ceil((paymentsData?.totalCount || 0) / paymentsPerPage),
    [paymentsData?.totalCount, paymentsPerPage]
  );

  const startItem = offset + 1;
  const endItem = Math.min(
    offset + paymentsPerPage,
    paymentsData?.totalCount || 0
  );

  const getName = (p: PaymentWithExtras) =>
    p.patient
      ? `${p.patient.firstName} ${p.patient.lastName}`.trim()
      : (p.patientName ?? "Unknown");

  const getInitials = (fullName: string) => {
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

  const getStatusInfo = (status?: PaymentStatus) => {
    switch (status) {
      case "PENDING":
        return {
          label: "Pending",
          color: "bg-yellow-100 text-yellow-800",
          icon: <Clock className="h-3 w-3 mr-1" />,
        };
      case "PARTIALLY_PAID":
        return {
          label: "Partially Paid",
          color: "bg-blue-100 text-blue-800",
          icon: <DollarSign className="h-3 w-3 mr-1" />,
        };
      case "PAID":
        return {
          label: "Paid",
          color: "bg-green-100 text-green-800",
          icon: <CheckCircle className="h-3 w-3 mr-1" />,
        };
      case "OVERPAID":
        return {
          label: "Overpaid",
          color: "bg-purple-100 text-purple-800",
          icon: <TrendingUp className="h-3 w-3 mr-1" />,
        };
      case "DENIED":
        return {
          label: "Denied",
          color: "bg-red-100 text-red-800",
          icon: <ThumbsDown className="h-3 w-3 mr-1" />,
        };
      case "VOID":
        return {
          label: "Void",
          color: "bg-gray-100 text-gray-800",
          icon: <Ban className="h-3 w-3 mr-1" />,
        };

      default:
        return {
          label: status
            ? (status as string).charAt(0).toUpperCase() +
              (status as string).slice(1).toLowerCase()
            : "Unknown",
          color: "bg-gray-100 text-gray-800",
          icon: <AlertCircle className="h-3 w-3 mr-1" />,
        };
    }
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
              <TableHead>Claim ID</TableHead>
              <TableHead>Patient Name</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Service Date</TableHead>
              <TableHead>Status</TableHead>
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
            ) : (paymentsData?.payments?.length ?? 0) === 0 ? (
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
                const totalBilled = Number(payment.totalBilled || 0);
                const totalPaid = Number(payment.totalPaid || 0);
                const totalDue = Number(payment.totalDue || 0);

                const displayName = getName(payment);
                const submittedOn =
                  payment.serviceLines?.[0]?.procedureDate ??
                  payment.claim?.createdAt ??
                  payment.createdAt ??
                  payment.serviceLineTransactions?.[0]?.receivedDate ??
                  null;

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

                    <TableCell>
                      {typeof payment.claimId === "number"
                        ? `CLM-${payment.claimId.toString().padStart(4, "0")}`
                        : "N/A"}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center">
                        <Avatar
                          className={`h-10 w-10 ${getAvatarColor(Number(payment.id))}`}
                        >
                          <AvatarFallback className="text-white">
                            {getInitials(displayName)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {displayName}
                          </div>
                          <div className="text-sm text-gray-500">
                            PID-{payment.patientId?.toString().padStart(4, "0")}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* 💰 Billed / Paid / Due breakdown */}
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span>
                          <strong>Total Billed:</strong> $
                          {Number(totalBilled).toFixed(2)}
                        </span>
                        <span>
                          <strong>Total Paid:</strong> ${totalPaid.toFixed(2)}
                        </span>
                        <span>
                          <strong>Total Due:</strong>{" "}
                          {totalDue > 0 ? (
                            <span className="text-yellow-600">
                              ${totalDue.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-green-600">Settled</span>
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatDateToHumanReadable(submittedOn)}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const { label, color, icon } = getStatusInfo(
                            payment.status
                          );
                          return (
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${color}`}
                            >
                              <span className="flex items-center">
                                {icon}
                                {label}
                              </span>
                            </span>
                          );
                        })()}
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        {allowDelete && (
                          <Button
                            onClick={() => {
                              handleDeletePayment(payment);
                            }}
                            className="text-red-600 hover:text-red-900"
                            aria-label="Delete Payment"
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

                        {/* When NOT PAID and NOT VOID → Pay in Full + Void */}
                        {payment.status !== "PAID" &&
                          payment.status !== "VOID" && (
                            <>
                              <Button
                                variant="warning"
                                size="sm"
                                onClick={() =>
                                  handlePayAbsoluteFullDue(payment.id)
                                }
                              >
                                Pay in Full
                              </Button>

                              {/* NEW: Void */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setVoidPaymentId(payment.id);
                                  setIsVoidOpen(true);
                                }}
                              >
                                Void
                              </Button>
                            </>
                          )}

                        {/* When PAID → Revert */}
                        {payment.status === "PAID" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setRevertPaymentId(payment.id);
                              setIsRevertOpen(true);
                            }}
                          >
                            Revert Full Due
                          </Button>
                        )}

                        {/* When VOID → Unvoid */}
                        {payment.status === "VOID" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setUnvoidPaymentId(payment.id);
                              setIsUnvoidOpen(true);
                            }}
                          >
                            Unvoid
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

      {/* Revert Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isRevertOpen}
        title="Confirm Revert"
        message={`Do you want to revert all Service Line payments for Payment ID: ${revertPaymentId}?`}
        confirmLabel="Revert"
        confirmColor="bg-yellow-600 hover:bg-yellow-700"
        onConfirm={handleRevert}
        onCancel={() => setIsRevertOpen(false)}
      />

      {/* NEW: Void Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isVoidOpen}
        title="Confirm Void"
        message={`Mark this payment as VOID? It will be excluded from balances and Calculations.`}
        confirmLabel="Void"
        confirmColor="bg-gray-700 hover:bg-gray-800"
        onConfirm={handleConfirmVoid}
        onCancel={() => setIsVoidOpen(false)}
      />

      {/* NEW: Unvoid Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isUnvoidOpen}
        title="Confirm Unvoid"
        message={`Restore this payment to a normal state (PENDING)?`}
        confirmLabel="Unvoid"
        confirmColor="bg-blue-600 hover:bg-blue-700"
        onConfirm={handleConfirmUnvoid}
        onCancel={() => setIsUnvoidOpen(false)}
      />

      <DeleteConfirmationDialog
        isOpen={isDeletePaymentOpen}
        onConfirm={handleConfirmDeletePayment}
        onCancel={() => setIsDeletePaymentOpen(false)}
        entityName={`PaymentID : ${currentPayment?.id}`}
      />

      {isEditPaymentOpen && currentPayment && (
        <EditPaymentModal
          isOpen={isEditPaymentOpen}
          onOpenChange={(open) => setIsEditPaymentOpen(open)}
          onClose={() => setIsEditPaymentOpen(false)}
          payment={currentPayment}
          onEditServiceLine={(updatedPayment) => {
            updatePaymentMutation.mutate(updatedPayment);
          }}
          isUpdatingServiceLine={updatePaymentMutation.isPending}
          onUpdateStatus={(paymentId, status) => {
            updatePaymentStatusMutation.mutate({ paymentId, status });
          }}
          isUpdatingStatus={updatePaymentStatusMutation.isPending}
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
