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
import { DeleteConfirmationDialog } from "@/components/ui/deleteDialog";
import { PatientTable } from "@/components/patients/patient-table";
import { Patient, PdfFile } from "@repo/db/types";

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
    setFileBlobUrl(null);
    setSelectedPdfId(null);
  }, [selectedPatient]);

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
      deletePdfMutation.mutate(Number(currentPdf.id));
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
                Document Groups for {selectedPatient.firstName}{" "}
                {selectedPatient.lastName}
              </CardTitle>
              <CardDescription>Select a group to view PDFs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {groups.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No groups found for this patient.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {groups.map((group: any) => (
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
                      Group - {group.title}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {selectedGroupId && (
          <Card>
            <CardHeader>
              <CardTitle>PDFs in Group</CardTitle>
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
                        onClick={() => handleDownloadPdf(pdf.id, pdf.filename)}
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

        {fileBlobUrl && (
          <Card>
            <CardHeader className="flex justify-between items-center">
              <CardTitle>Viewing PDF</CardTitle>
              <Button
                variant="outline"
                className="ml-auto text-red-600 border-red-500 hover:bg-red-100 hover:border-red-600"
                onClick={() => {
                  setFileBlobUrl(null);
                  setSelectedPdfId(null);
                }}
              >
                ✕ Close
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
