import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Eye, Trash, Download, FolderOpen } from "lucide-react";
import { DeleteConfirmationDialog } from "@/components/ui/deleteDialog";
import { PatientTable } from "@/components/patients/patient-table";
import { Patient, PdfFile } from "@repo/db/types";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import DocumentsFilePreviewModal from "@/components/documents/file-preview-modal";
import { getPageNumbers } from "@/utils/pageNumberGenerator";

export default function DocumentsPage() {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null);

  // pagination state for the expanded group
  // pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(5);
  const offset = (currentPage - 1) * limit;
  const [totalForExpandedGroup, setTotalForExpandedGroup] = useState<
    number | null
  >(null);

  // PDF view state - viewing / downloading
  const [previewFileId, setPreviewFileId] = useState<number | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewFileNameHint, setPreviewFileNameHint] = useState<string | null>(
    null
  );
  const [currentPdf, setCurrentPdf] = useState<PdfFile | null>(null);

  // Delete dialog
  const [isDeletePdfOpen, setIsDeletePdfOpen] = useState(false);

  // reset UI when patient changes
  useEffect(() => {
    setExpandedGroupId(null);
    setLimit(5);
    setCurrentPage(1);
    setTotalForExpandedGroup(null);

    // close the preview modal and clear any preview hints
    setIsPreviewOpen(false);
    setPreviewFileId(null);
    setPreviewFileNameHint(null);
  }, [selectedPatient]);

  // FETCH GROUPS for patient (includes `category` on each group)
  const { data: groups = [], isLoading: isLoadingGroups } = useQuery({
    queryKey: ["groups", selectedPatient?.id],
    enabled: !!selectedPatient,
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/documents/pdf-groups/patient/${selectedPatient?.id}`
      );
      return res.json();
    },
  });

  // Group groups by titleKey (use titleKey only for grouping/ordering; don't display it)
  const groupsByTitleKey = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const g of groups as any[]) {
      const key = String(g.titleKey ?? "OTHER");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(g);
    }

    // Decide on a stable order for titleKey buckets: prefer enum order then any extras
    const preferredOrder = [
      "INSURANCE_CLAIM",
      "INSURANCE_CLAIM_PREAUTH",
      "ELIGIBILITY_STATUS",
      "CLAIM_STATUS",
      "OTHER",
    ];
    const orderedKeys: string[] = [];

    for (const k of preferredOrder) {
      if (map.has(k)) orderedKeys.push(k);
    }
    // append any keys that weren't in preferredOrder
    for (const k of map.keys()) {
      if (!orderedKeys.includes(k)) orderedKeys.push(k);
    }

    return { map, orderedKeys };
  }, [groups]);

  // FETCH PDFs for selected group with pagination (limit & offset)
  const {
    data: groupPdfsResponse,
    refetch: refetchGroupPdfs,
    isFetching: isFetchingPdfs,
  } = useQuery({
    queryKey: ["groupPdfs", expandedGroupId, currentPage, limit],
    enabled: !!expandedGroupId,
    queryFn: async () => {
      // API should accept ?limit & ?offset and also return total count
      const res = await apiRequest(
        "GET",
        `/api/documents/recent-pdf-files/group/${expandedGroupId}?limit=${limit}&offset=${offset}`
      );
      // expected shape: { data: PdfFile[], total: number }
      const json = await res.json();
      setTotalForExpandedGroup(json.total ?? null);
      return json.data ?? [];
    },
  });

  const groupPdfs: PdfFile[] = groupPdfsResponse ?? [];

  // DELETE mutation
  const deletePdfMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/documents/pdf-files/${id}`);
    },
    onSuccess: () => {
      setIsDeletePdfOpen(false);
      setCurrentPdf(null);
      queryClient.invalidateQueries({
        queryKey: ["groupPdfs", expandedGroupId],
      });
      toast({ title: "Success", description: "PDF deleted successfully!" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete PDF",
        variant: "destructive",
      });
    },
  });

  const handleConfirmDeletePdf = () => {
    if (currentPdf) {
      deletePdfMutation.mutate(Number(currentPdf.id));
    } else {
      toast({
        title: "Error",
        description: "No PDF selected for deletion.",
        variant: "destructive",
      });
    }
  };

  const handleViewPdf = (pdfId: number, filename?: string) => {
    setPreviewFileNameHint(filename ?? null);
    setPreviewFileId(pdfId);
    setIsPreviewOpen(true);
  };

  const handleDownloadPdf = async (pdfId: number, filename: string) => {
    const res = await apiRequest("GET", `/api/documents/pdf-files/${pdfId}`);
    const arrayBuffer = await res.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Expand / collapse a group — when expanding reset pagination
  const toggleExpandGroup = (groupId: number) => {
    if (expandedGroupId === groupId) {
      setExpandedGroupId(null);
      setCurrentPage(1);
      setLimit(5);
      setTotalForExpandedGroup(null);
    } else {
      setExpandedGroupId(groupId);
      setCurrentPage(1);
      setLimit(5);
      setTotalForExpandedGroup(null);
    }
  };

  // pagintaion helper
  const totalPages = totalForExpandedGroup
    ? Math.ceil(totalForExpandedGroup / limit)
    : 1;

  const startItem = totalForExpandedGroup ? offset + 1 : 0;
  const endItem = totalForExpandedGroup
    ? Math.min(offset + limit, totalForExpandedGroup)
    : 0;

  return (
    <div>
      <div className="container mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
            <p className="text-muted-foreground">
              View and manage recent uploaded claim PDFs
            </p>
          </div>
        </div>

        {selectedPatient && (
          <Card>
            <CardHeader>
              <CardTitle>
                Document groups of Patient: {selectedPatient.firstName}{" "}
                {selectedPatient.lastName}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {isLoadingGroups ? (
                <div>Loading groups…</div>
              ) : (groups as any[]).length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No groups found.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {groupsByTitleKey.orderedKeys.map((key, idx) => {
                    const bucket = groupsByTitleKey.map.get(key) ?? [];
                    return (
                      <div key={key}>
                        {/* subtle divider between buckets (no enum text shown) */}
                        {idx !== 0 && (
                          <hr className="my-3 border-t border-gray-200" />
                        )}

                        <div className="flex flex-col gap-2">
                          {bucket.map((group: any) => (
                            <div key={group.id} className="border rounded p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <FolderOpen className="w-5 h-5" />
                                  <div>
                                    {/* Only show the group's title string */}
                                    <div className="font-semibold">
                                      {group.title}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant={
                                      expandedGroupId === group.id
                                        ? "default"
                                        : "outline"
                                    }
                                    onClick={() => toggleExpandGroup(group.id)}
                                  >
                                    {expandedGroupId === group.id
                                      ? "Collapse"
                                      : "Open"}
                                  </Button>
                                </div>
                              </div>

                              {/* expanded content: show paginated PDFs for this group */}
                              {expandedGroupId === group.id && (
                                <div className="mt-3 space-y-3">
                                  {isFetchingPdfs ? (
                                    <div>Loading PDFs…</div>
                                  ) : groupPdfs.length === 0 ? (
                                    <div className="text-muted-foreground">
                                      No PDFs in this group.
                                    </div>
                                  ) : (
                                    <div className="flex flex-col gap-2">
                                      {groupPdfs.map((pdf) => (
                                        <div
                                          key={pdf.id}
                                          className="flex justify-between items-center border rounded p-2"
                                        >
                                          <div className="text-sm">
                                            {pdf.filename}
                                          </div>
                                          <div className="flex gap-2">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                handleViewPdf(
                                                  Number(pdf.id),
                                                  pdf.filename
                                                )
                                              }
                                            >
                                              <Eye className="w-4 h-4" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                handleDownloadPdf(
                                                  Number(pdf.id),
                                                  pdf.filename
                                                )
                                              }
                                            >
                                              <Download className="w-4 h-4" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => {
                                                setCurrentPdf(pdf);
                                                setIsDeletePdfOpen(true);
                                              }}
                                            >
                                              <Trash className="w-4 h-4" />
                                            </Button>
                                          </div>
                                        </div>
                                      ))}

                                      {/* Pagination */}
                                      {totalPages > 1 && (
                                        <div className="bg-white px-4 py-3 border-t border-gray-200 rounded">
                                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                            <div className="text-sm text-muted-foreground mb-2 sm:mb-0 whitespace-nowrap">
                                              Showing {startItem}–{endItem} of{" "}
                                              {totalForExpandedGroup || 0}{" "}
                                              results
                                            </div>
                                            <Pagination>
                                              <PaginationContent>
                                                <PaginationItem>
                                                  <PaginationPrevious
                                                    href="#"
                                                    onClick={(e) => {
                                                      e.preventDefault();
                                                      if (currentPage > 1)
                                                        setCurrentPage(
                                                          currentPage - 1
                                                        );
                                                    }}
                                                    className={
                                                      currentPage === 1
                                                        ? "pointer-events-none opacity-50"
                                                        : ""
                                                    }
                                                  />
                                                </PaginationItem>

                                                {getPageNumbers(
                                                  currentPage,
                                                  totalPages
                                                ).map((page, idx) => (
                                                  <PaginationItem key={idx}>
                                                    {page === "..." ? (
                                                      <span className="px-2 text-gray-500">
                                                        ...
                                                      </span>
                                                    ) : (
                                                      <PaginationLink
                                                        href="#"
                                                        onClick={(e) => {
                                                          e.preventDefault();
                                                          setCurrentPage(
                                                            page as number
                                                          );
                                                        }}
                                                        isActive={
                                                          currentPage === page
                                                        }
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
                                                      if (
                                                        currentPage < totalPages
                                                      )
                                                        setCurrentPage(
                                                          currentPage + 1
                                                        );
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
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <DocumentsFilePreviewModal
          fileId={previewFileId}
          isOpen={isPreviewOpen}
          onClose={() => {
            setIsPreviewOpen(false);
            setPreviewFileId(null);
            setPreviewFileNameHint(null);
          }}
          initialFileName={previewFileNameHint}
        />

        <Card>
          <CardHeader>
            <CardTitle>Patient Records</CardTitle>
            <CardDescription>
              Select a patient to view document groups
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PatientTable
              allowView
              allowDelete
              allowCheckbox
              allowEdit
              onSelectPatient={setSelectedPatient}
            />
          </CardContent>
        </Card>

        <DeleteConfirmationDialog
          isOpen={isDeletePdfOpen}
          onConfirm={handleConfirmDeletePdf}
          onCancel={() => setIsDeletePdfOpen(false)}
          entityName={`PDF #${currentPdf?.id}`}
        />
      </div>
    </div>
  );
}
