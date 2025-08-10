import { useEffect, useState, useMemo } from "react";
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
  AlertCircle,
  CheckCircle,
  Clock,
  Delete,
  Edit,
  Eye,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { DeleteConfirmationDialog } from "../ui/deleteDialog";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDateToHumanReadable } from "@/utils/dateUtils";
import ClaimViewModal from "./claim-view-modal";
import ClaimEditModal from "./claim-edit-modal";
import { Claim, ClaimStatus, ClaimWithServiceLines } from "@repo/db/types";

interface ClaimApiResponse {
  claims: ClaimWithServiceLines[];
  totalCount: number;
}

interface ClaimsRecentTableProps {
  allowEdit?: boolean;
  allowView?: boolean;
  allowDelete?: boolean;
  allowCheckbox?: boolean;
  onSelectClaim?: (claim: Claim | null) => void;
  onPageChange?: (page: number) => void;
  patientId?: number;
}

export default function ClaimsRecentTable({
  allowEdit,
  allowView,
  allowDelete,
  allowCheckbox,
  onSelectClaim,
  onPageChange,
  patientId,
}: ClaimsRecentTableProps) {
  const { toast } = useToast();

  const [isViewClaimOpen, setIsViewClaimOpen] = useState(false);
  const [isEditClaimOpen, setIsEditClaimOpen] = useState(false);
  const [isDeleteClaimOpen, setIsDeleteClaimOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const claimsPerPage = 5;
  const offset = (currentPage - 1) * claimsPerPage;

  const [currentClaim, setCurrentClaim] = useState<
    ClaimWithServiceLines | undefined
  >(undefined);
  const [selectedClaimId, setSelectedClaimId] = useState<number | null>(null);

  const handleSelectClaim = (claim: Claim) => {
    const isSelected = selectedClaimId === claim.id;
    const newSelectedId = isSelected ? null : claim.id;
    setSelectedClaimId(Number(newSelectedId));

    if (onSelectClaim) {
      onSelectClaim(isSelected ? null : claim);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [patientId]);

  const getClaimsQueryKey = () =>
    patientId
      ? ["claims-recent", "patient", patientId, currentPage]
      : ["claims-recent", "global", currentPage];

  const {
    data: claimsData,
    isLoading,
    isError,
  } = useQuery<ClaimApiResponse, Error>({
    queryKey: getClaimsQueryKey(),

    queryFn: async () => {
      const endpoint = patientId
        ? `/api/claims/patient/${patientId}?limit=${claimsPerPage}&offset=${offset}`
        : `/api/claims/recent?limit=${claimsPerPage}&offset=${offset}`;

      const res = await apiRequest("GET", endpoint);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Search failed");
      }
      return res.json();
    },
    placeholderData: { claims: [], totalCount: 0 },
  });

  const updateClaimMutation = useMutation({
    mutationFn: async (claim: ClaimWithServiceLines) => {
      const response = await apiRequest("PUT", `/api/claims/${claim.id}`, {
        status: claim.status,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update claim");
      }
      return response.json();
    },
    onSuccess: () => {
      setIsEditClaimOpen(false);
      toast({
        title: "Success",
        description: "Claim updated successfully!",
        variant: "default",
      });
      queryClient.invalidateQueries({
        queryKey: getClaimsQueryKey(),
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

  const deleteClaimMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/claims/${id}`);
      return;
    },
    onSuccess: () => {
      setIsDeleteClaimOpen(false);
      queryClient.invalidateQueries({
        queryKey: getClaimsQueryKey(),
      });
      toast({
        title: "Success",
        description: "Claim deleted successfully!",
        variant: "default",
      });
    },
    onError: (error) => {
      console.log(error);
      toast({
        title: "Error",
        description: `Failed to delete claim: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleEditClaim = (claim: ClaimWithServiceLines) => {
    setCurrentClaim(claim);
    setIsEditClaimOpen(true);
  };

  const handleViewClaim = (claim: ClaimWithServiceLines) => {
    setCurrentClaim(claim);
    setIsViewClaimOpen(true);
  };

  const handleDeleteClaim = (claim: ClaimWithServiceLines) => {
    setCurrentClaim(claim);
    setIsDeleteClaimOpen(true);
  };

  const handleConfirmDeleteClaim = async () => {
    if (currentClaim) {
      if (typeof currentClaim.id === "number") {
        deleteClaimMutation.mutate(currentClaim.id);
      } else {
        toast({
          title: "Error",
          description: "Selected claim is missing an ID for deletion.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Error",
        description: "No patient selected for deletion.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (onPageChange) onPageChange(currentPage);
  }, [currentPage, onPageChange]);

  const totalPages = useMemo(
    () => Math.ceil((claimsData?.totalCount || 0) / claimsPerPage),
    [claimsData?.totalCount, claimsPerPage]
  );

  const startItem = offset + 1;
  const endItem = Math.min(offset + claimsPerPage, claimsData?.totalCount || 0);

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
      (sum, line) => sum + Number(line.totalBilled || 0),
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
              <TableHead>Claim ID</TableHead>
              <TableHead>Patient Name</TableHead>
              <TableHead>Submission Date</TableHead>
              <TableHead>Insurance Provider</TableHead>
              <TableHead>Member ID</TableHead>
              <TableHead>Total Billed</TableHead>
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
                  Error loading claims.
                </TableCell>
              </TableRow>
            ) : (claimsData?.claims ?? []).length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No claims found.
                </TableCell>
              </TableRow>
            ) : (
              claimsData?.claims.map((claim) => (
                <TableRow key={claim.id} className="hover:bg-gray-50">
                  {allowCheckbox && (
                    <TableCell>
                      <Checkbox
                        checked={selectedClaimId === claim.id}
                        onCheckedChange={() => handleSelectClaim(claim)}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="text-sm font-medium text-gray-900">
                      CML-{claim.id!.toString().padStart(4, "0")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Avatar
                        className={`h-10 w-10 ${getAvatarColor(claim.patientId)}`}
                      >
                        <AvatarFallback className="text-white">
                          {getInitialsFromName(claim.patientName)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {claim.patientName}
                        </div>
                        <div className="text-sm text-gray-500">
                          DOB: {formatDateToHumanReadable(claim.dateOfBirth)}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-900">
                      {formatDateToHumanReadable(claim.createdAt!)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-900">
                      {claim.insuranceProvider ?? "Not specified"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-900">
                      {claim.memberId ?? "Not specified"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-900">
                      ${getTotalBilled(claim).toFixed(2)}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const { label, color, icon } = getStatusInfo(
                          claim.status
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
                            handleDeleteClaim(claim);
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
                            handleEditClaim(claim);
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
                            handleViewClaim(claim);
                          }}
                          className="text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DeleteConfirmationDialog
        isOpen={isDeleteClaimOpen}
        onConfirm={handleConfirmDeleteClaim}
        onCancel={() => setIsDeleteClaimOpen(false)}
        entityName={currentClaim?.patientName}
      />

      {isViewClaimOpen && currentClaim && (
        <ClaimViewModal
          isOpen={isViewClaimOpen}
          onClose={() => setIsViewClaimOpen(false)}
          onOpenChange={(open) => setIsViewClaimOpen(open)}
          onEditClaim={(claim) => handleEditClaim(claim)}
          claim={currentClaim}
        />
      )}

      {isEditClaimOpen && currentClaim && (
        <ClaimEditModal
          isOpen={isEditClaimOpen}
          onClose={() => setIsEditClaimOpen(false)}
          onOpenChange={(open) => setIsEditClaimOpen(open)}
          claim={currentClaim}
          onSave={(updatedClaim) => {
            updateClaimMutation.mutate(updatedClaim);
          }}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground mb-2 sm:mb-0 whitespace-nowrap">
              Showing {startItem}–{endItem} of {claimsData?.totalCount || 0}{" "}
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
