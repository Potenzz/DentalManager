import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { TopAppBar } from "@/components/layout/top-app-bar";
import { Sidebar } from "@/components/layout/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Settings,
  Trash,
  Download,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClaimPdfUncheckedCreateInputObjectSchema } from "@repo/db/usedSchemas";
import { z } from "zod";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import { Viewer, Worker } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { DeleteConfirmationDialog } from "@/components/ui/deleteDialog";

const ClaimPdfSchema =
  ClaimPdfUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>;
type ClaimPdf = z.infer<typeof ClaimPdfSchema>;

export default function DocumentsPage() {
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [selectedPdfId, setSelectedPdfId] = useState<number | null>(null);
  const defaultLayoutPluginInstance = defaultLayoutPlugin();
  const [isDeletePdfOpen, setIsDeletePdfOpen] = useState(false);
  const [currentPdf, setCurrentPdf] = useState<ClaimPdf | null>(null);

  const { data: pdfs = [], isLoading } = useQuery<ClaimPdf[]>({
    queryKey: ["/api/documents/claim-pdf/recent"],
    enabled: !!user,
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/documents/claim-pdf/recent");
      return res.json();
    },
  });

  const deletePdfMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/documents/claim-pdf/${id}`);
    },
    onSuccess: () => {
      setIsDeletePdfOpen(false);
      setCurrentPdf(null);
      queryClient.invalidateQueries({
        queryKey: ["/api/documents/claim-pdf/recent"],
      });

      toast({
        title: "Success",
        description: "PDF deleted successfully!",
        variant: "default",
      });
    },
    onError: (error: any) => {
      console.error("Error deleting PDF:", error);
      toast({
        title: "Error",
        description: `Failed to delete PDF: ${error.message || error}`,
        variant: "destructive",
      });
    },
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getPatientInitials = (first: string, last: string) =>
    `${first[0]}${last[0]}`.toUpperCase();

  const [fileBlobUrl, setFileBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedPdfId) return;
    let url: string | null = null;

    const fetchPdf = async () => {
      try {
        const res = await apiRequest(
          "GET",
          `/api/documents/claim-pdf/${selectedPdfId}`
        );

        const arrayBuffer = await res.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: "application/pdf" });
        const objectUrl = URL.createObjectURL(blob);
        setFileBlobUrl(objectUrl);
        url = objectUrl;
      } catch (err) {
        console.error("Failed to load PDF", err);
      }
    };

    fetchPdf();

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [selectedPdfId]);

  const toggleMobileMenu = () => setIsMobileMenuOpen((prev) => !prev);

  const viewPdf = (pdfId: number) => {
    setSelectedPdfId(pdfId);
  };

  const downloadPdf = async (pdfId: number, filename: string) => {
    try {
      const res = await apiRequest("GET", `/api/documents/claim-pdf/${pdfId}`);
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
    } catch (err) {
      console.error("Failed to download PDF:", err);
    }
  };

  const handleDeletePdf = (pdf: ClaimPdf) => {
    setCurrentPdf(pdf);
    setIsDeletePdfOpen(true);
  };

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

  const filteredPdfs = pdfs.filter((pdf) => {
    const patient = pdf.patient;
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
    const patientId = `PID-${patient.id.toString().padStart(4, "0")}`;

    switch (searchField) {
      case "name":
        return fullName.includes(searchLower);
      case "id":
        return patientId.toLowerCase().includes(searchLower);
      case "phone":
        return patient.phone?.toLowerCase().includes(searchLower) || false;
      case "all":
      default:
        return (
          fullName.includes(searchLower) ||
          patientId.includes(searchLower) ||
          patient.phone?.toLowerCase().includes(searchLower) ||
          patient.email?.toLowerCase().includes(searchLower) ||
          false
        );
    }
  });

  const totalPages = Math.ceil(filteredPdfs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentPdfs = filteredPdfs.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopAppBar toggleMobileMenu={toggleMobileMenu} />

        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                Documents
              </h1>
              <p className="text-gray-600">
                View and manage recent uploaded claim PDFs
              </p>
            </div>

            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search patients..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Select value={searchField} onValueChange={setSearchField}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Fields</SelectItem>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="id">Patient ID</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Advanced
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="text-center py-8">Loading data...</div>
                ) : currentPdfs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {searchTerm
                      ? "No results matching your search."
                      : "No recent claim PDFs available."}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b text-sm font-medium text-gray-600">
                      <div className="col-span-3">Patient</div>
                      <div className="col-span-2">DOB / Gender</div>
                      <div className="col-span-2">Contact</div>
                      <div className="col-span-2">Insurance</div>
                      <div className="col-span-2">Status</div>
                      <div className="col-span-1">Actions</div>
                    </div>

                    {currentPdfs.map((pdf) => {
                      const patient = pdf.patient;
                      return (
                        <div
                          key={pdf.id}
                          className="grid grid-cols-12 gap-4 p-4 border-b hover:bg-gray-50"
                        >
                          <div className="col-span-3 flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                              {getPatientInitials(
                                patient.firstName,
                                patient.lastName
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {patient.firstName} {patient.lastName}
                              </div>
                              <div className="text-sm text-gray-500">
                                PID-{patient.id.toString().padStart(4, "0")}
                              </div>
                            </div>
                          </div>

                          <div className="col-span-2">
                            <div className="text-sm text-gray-900">
                              {formatDate(patient.dateOfBirth)}
                            </div>
                            <div className="text-sm text-gray-500 capitalize">
                              {patient.gender}
                            </div>
                          </div>

                          <div className="col-span-2">
                            <div className="text-sm text-gray-900">
                              {patient.phone || "Not provided"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {patient.email || "No email"}
                            </div>
                          </div>

                          <div className="col-span-2">
                            <div className="text-sm text-gray-900">
                              {patient.insuranceProvider
                                ? `${patient.insuranceProvider.charAt(0).toUpperCase()}${patient.insuranceProvider.slice(1)}`
                                : "Not specified"}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {patient.insuranceId || "N/A"}
                            </div>
                          </div>

                          <div className="col-span-2">
                            <span
                              className={cn(
                                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                                patient.status === "active"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              )}
                            >
                              {patient.status === "active"
                                ? "Active"
                                : "Inactive"}
                            </span>
                          </div>

                          <div className="col-span-1">
                            <div className="flex space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleDeletePdf(pdf)}
                              >
                                <Trash className="h-4 w-4 text-red-600" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() =>
                                  downloadPdf(pdf.id, pdf.filename)
                                }
                              >
                                <Download className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => viewPdf(pdf.id)}
                              >
                                <Eye className="h-4 w-4 text-gray-600" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <DeleteConfirmationDialog
                      isOpen={isDeletePdfOpen}
                      onConfirm={handleConfirmDeletePdf}
                      onCancel={() => setIsDeletePdfOpen(false)}
                      entityName={`PDF #${currentPdf?.id}`}
                    />

                    {/* PDF Viewer */}
                    {selectedPdfId && fileBlobUrl && (
                      <div className="mt-6 border rounded-lg shadow-sm p-4 bg-white">
                        <div className="flex justify-between items-center mb-4">
                          <h2 className="text-lg font-semibold text-gray-700">
                            Viewing PDF #{selectedPdfId}
                          </h2>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setSelectedPdfId(null);
                              setFileBlobUrl(null);
                            }}
                          >
                            Close
                          </Button>
                        </div>
                        <div className="h-[80vh] border">
                          <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                            <Viewer
                              fileUrl={fileBlobUrl}
                              plugins={[defaultLayoutPluginInstance]}
                            />
                          </Worker>
                        </div>
                      </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between p-4 border-t bg-gray-50">
                        <div className="text-sm text-gray-700">
                          Showing {startIndex + 1} to{" "}
                          {Math.min(
                            startIndex + itemsPerPage,
                            filteredPdfs.length
                          )}{" "}
                          of {filteredPdfs.length} results
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(currentPage - 1)}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Previous
                          </Button>
                          {Array.from(
                            { length: totalPages },
                            (_, i) => i + 1
                          ).map((page) => (
                            <Button
                              key={page}
                              variant={
                                currentPage === page ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="w-8 h-8 p-0"
                            >
                              {page}
                            </Button>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                          >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
