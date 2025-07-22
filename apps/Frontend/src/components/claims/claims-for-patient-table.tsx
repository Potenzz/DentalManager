// components/claims/ClaimsForPatientTable.tsx

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Eye, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from "@/components/ui/pagination";
import { DeleteConfirmationDialog } from "@/components/modals/DeleteConfirmationDialog";
import ClaimViewModal from "@/components/modals/ClaimViewModal";

interface Claim {
  id: number;
  patientId: number;
  patientName: string;
  serviceDate: string;
  insuranceProvider: string;
  status: string;
  remarks: string;
  createdAt: string;
}

interface Props {
  patientId: number;
}

export default function ClaimsForPatientTable({ patientId }: Props) {
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [viewClaim, setViewClaim] = useState<Claim | null>(null);
  const [deleteClaim, setDeleteClaim] = useState<Claim | null>(null);

  const limit = 5;
  const offset = (currentPage - 1) * limit;

  const { data, isLoading } = useQuery({
    queryKey: ["claims-by-patient", patientId, currentPage],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/claims/by-patient/${patientId}?limit=${limit}&offset=${offset}`);
      if (!res.ok) throw new Error("Failed to load claims for patient");
      return res.json();
    },
    enabled: !!patientId,
    placeholderData: { data: [], total: 0 },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/claims/${id}`);
      if (!res.ok) throw new Error("Failed to delete claim");
    },
    onSuccess: () => {
      toast({ title: "Deleted", description: "Claim removed." });
      queryClient.invalidateQueries({ queryKey: ["claims-by-patient"] });
    },
  });

  const handleDelete = () => {
    if (deleteClaim) deleteMutation.mutate(deleteClaim.id);
    setDeleteClaim(null);
  };

  const totalPages = useMemo(() => Math.ceil((data?.total || 0) / limit), [data]);

  return (
    <div className="bg-white rounded shadow p-4 mt-4">
      <h2 className="text-xl font-bold mb-4">Claims for Selected Patient</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Claim ID</TableHead>
            <TableHead>Service Date</TableHead>
            <TableHead>Insurance</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.data?.map((claim: Claim) => (
            <TableRow key={claim.id}>
              <TableCell>CLM-{claim.id.toString().padStart(4, "0")}</TableCell>
              <TableCell>{format(new Date(claim.serviceDate), "MMM dd, yyyy")}</TableCell>
              <TableCell>{claim.insuranceProvider}</TableCell>
              <TableCell>{claim.status}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button size="icon" variant="ghost" onClick={() => setViewClaim(claim)}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => {/* handle edit */}}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setDeleteClaim(claim)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Pagination>
        <PaginationContent>
          {Array.from({ length: totalPages }).map((_, i) => (
            <PaginationItem key={i}>
              <PaginationLink isActive={i + 1 === currentPage} onClick={() => setCurrentPage(i + 1)}>
                {i + 1}
              </PaginationLink>
            </PaginationItem>
          ))}
        </PaginationContent>
      </Pagination>

      <ClaimViewModal claim={viewClaim} onClose={() => setViewClaim(null)} />
      <DeleteConfirmationDialog
        isOpen={!!deleteClaim}
        onConfirm={handleDelete}
        onCancel={() => setDeleteClaim(null)}
        entityName="claim"
      />
    </div>
  );
}
