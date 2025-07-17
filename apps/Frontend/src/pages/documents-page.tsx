import { useEffect, useState } from "react";
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
import {
  PatientUncheckedCreateInputObjectSchema,
  PdfFileUncheckedCreateInputObjectSchema,
} from "@repo/db/usedSchemas";
import { DeleteConfirmationDialog } from "@/components/ui/deleteDialog";
import { PatientTable } from "@/components/patients/patient-table";
import { z } from "zod";
import { Sidebar } from "@/components/layout/sidebar";
import { TopAppBar } from "@/components/layout/top-app-bar";

const PatientSchema = (
  PatientUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
).omit({
  appointments: true,
});
type Patient = z.infer<typeof PatientSchema>;

const PdfFileSchema =
  PdfFileUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>;
type PdfFile = z.infer<typeof PdfFileSchema>;

export default function DocumentsPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedPdfId, setSelectedPdfId] = useState<number | null>(null);
  const [fileBlobUrl, setFileBlobUrl] = useState<string | null>(null);
  const [isDeletePdfOpen, setIsDeletePdfOpen] = useState(false);
  const [currentPdf, setCurrentPdf] = useState<PdfFile | null>(null);

  const toggleMobileMenu = () => setIsMobileMenuOpen((prev) => !prev);

  useEffect(() => {
    setSelectedGroupId(null);
  }, [selectedPatient]);

  const handleSelectGroup = (groupId: number) => {
    setSelectedGroupId((prev) => (prev === groupId ? null : groupId));
  };

  const { data: groups = [] } = useQuery({
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

  const { data: groupPdfs = [] } = useQuery({
    queryKey: ["groupPdfs", selectedGroupId],
    enabled: !!selectedGroupId,
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/documents/pdf-files/group/${selectedGroupId}`
      );
      return res.json();
    },
  });

  const deletePdfMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/documents/pdf-files/${id}`);
    },
    onSuccess: () => {
      setIsDeletePdfOpen(false);
      setCurrentPdf(null);
      if (selectedGroupId != null) {
        queryClient.invalidateQueries({
          queryKey: ["groupPdfs", selectedGroupId],
        });
      }
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
      deletePdfMutation.mutate(currentPdf.id);
    } else {
      toast({
        title: "Error",
        description: "No PDF selected for deletion.",
        variant: "destructive",
      });
    }
  };

  const handleViewPdf = async (pdfId: number) => {
    const res = await apiRequest("GET", `/api/documents/pdf-files/${pdfId}`);
    const arrayBuffer = await res.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    setFileBlobUrl(url);
    setSelectedPdfId(pdfId);
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

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopAppBar toggleMobileMenu={toggleMobileMenu} />

        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                Documents
              </h1>
              <p className="text-gray-600">
                View and manage recent uploaded claim PDFs
              </p>
            </div>

            {selectedPatient && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    Document Groups for {selectedPatient.firstName}{" "}
                    {selectedPatient.lastName}
                  </CardTitle>
                  <CardDescription>Select a group to view PDFs</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {groups.length === 0 ? (
                    <p className="text-muted-foreground">
                      No groups found for this patient.
                    </p>
                  ) : (
                    groups.map((group: any) => (
                      <Button
                        key={group.id}
                        variant={
                          group.id === selectedGroupId ? "default" : "outline"
                        }
                        onClick={() =>
                          setSelectedGroupId((prevId) =>
                            prevId === group.id ? null : group.id
                          )
                        }
                      >
                        <FolderOpen className="w-4 h-4 mr-2" />
                        Group #{group.id} - {group.title}
                      </Button>
                    ))
                  )}
                </CardContent>
              </Card>
            )}

            {selectedGroupId && (
              <Card>
                <CardHeader>
                  <CardTitle>PDFs in Group #{selectedGroupId}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {groupPdfs.length === 0 ? (
                    <p className="text-muted-foreground">
                      No PDFs found in this group.
                    </p>
                  ) : (
                    groupPdfs.map((pdf: any) => (
                      <div
                        key={pdf.id}
                        className="flex justify-between items-center border p-2 rounded"
                      >
                        <span className="text-sm">{pdf.filename}</span>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewPdf(pdf.id)}
                          >
                            <Eye className="w-4 h-4 text-gray-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleDownloadPdf(pdf.id, pdf.filename)
                            }
                          >
                            <Download className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setCurrentPdf(pdf);
                              setIsDeletePdfOpen(true);
                            }}
                          >
                            <Trash className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            )}

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

            {fileBlobUrl && (
              <Card>
                <CardHeader className="flex justify-between items-center">
                  <CardTitle>Viewing PDF #{selectedPdfId}</CardTitle>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setFileBlobUrl(null);
                      setSelectedPdfId(null);
                    }}
                  >
                    Close
                  </Button>
                </CardHeader>
                <CardContent>
                  <iframe
                    src={fileBlobUrl}
                    className="w-full h-[80vh] border rounded"
                    title="PDF Viewer"
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
