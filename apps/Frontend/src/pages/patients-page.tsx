import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { TopAppBar } from "@/components/layout/top-app-bar";
import { Sidebar } from "@/components/layout/sidebar";
import { PatientTable } from "@/components/patients/patient-table";
import { AddPatientModal } from "@/components/patients/add-patient-modal";
import {
  PatientSearch,
  SearchCriteria,
} from "@/components/patients/patient-search";
import { FileUploadZone } from "@/components/file-upload/file-upload-zone";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, File, FilePlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PatientUncheckedCreateInputObjectSchema } from "@repo/db/usedSchemas";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
import { DeleteConfirmationDialog } from "@/components/ui/deleteDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import useExtractPdfData from "@/hooks/use-extractPdfData";

const PatientSchema = (
  PatientUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
).omit({
  appointments: true,
});
type Patient = z.infer<typeof PatientSchema>;

const insertPatientSchema = (
  PatientUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
).omit({
  id: true,
  createdAt: true,
  userId: true,
});
type InsertPatient = z.infer<typeof insertPatientSchema>;

const updatePatientSchema = (
  PatientUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
)
  .omit({
    id: true,
    createdAt: true,
    userId: true,
  })
  .partial();

type UpdatePatient = z.infer<typeof updatePatientSchema>;

// Type for the ref to access modal methods
type AddPatientModalRef = {
  shouldSchedule: boolean;
  navigateToSchedule: (patientId: number) => void;
};

export default function PatientsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [isViewPatientOpen, setIsViewPatientOpen] = useState(false);
  const [isDeletePatientOpen, setIsDeletePatientOpen] = useState(false);
  const [currentPatient, setCurrentPatient] = useState<Patient | undefined>(
    undefined
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria | null>(
    null
  );
  const addPatientModalRef = useRef<AddPatientModalRef | null>(null);

  // File upload states
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [formData, setFormData] = useState({ PatientName: "", PatientMemberId: "", PatientDob:"" });
  const { mutate: extractPdf} = useExtractPdfData();


  // Fetch patients
  const {
    data: patients = [],
    isLoading: isLoadingPatients,
    refetch: refetchPatients,
  } = useQuery<Patient[]>({
    queryKey: ["/api/patients/"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/patients/");
      return res.json();
    },
    enabled: !!user,
  });

  // Add patient mutation
  const addPatientMutation = useMutation({
    mutationFn: async (patient: InsertPatient) => {
      const res = await apiRequest("POST", "/api/patients/", patient);
      return res.json();
    },
    onSuccess: (newPatient) => {
      setIsAddPatientOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/patients/"] });
      toast({
        title: "Success",
        description: "Patient added successfully!",
        variant: "default",
      });

      // If the add patient modal wants to proceed to scheduling, redirect to appointments page
      if (addPatientModalRef.current?.shouldSchedule) {
        addPatientModalRef.current.navigateToSchedule(newPatient.id);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add patient: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update patient mutation
  const updatePatientMutation = useMutation({
    mutationFn: async ({
      id,
      patient,
    }: {
      id: number;
      patient: UpdatePatient;
    }) => {
      const res = await apiRequest("PUT", `/api/patients/${id}`, patient);
      return res.json();
    },
    onSuccess: () => {
      setIsAddPatientOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/patients/"] });
      toast({
        title: "Success",
        description: "Patient updated successfully!",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update patient: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deletePatientMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/patients/${id}`);
      return;
    },
    onSuccess: () => {
      setIsDeletePatientOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/patients/"] });
      toast({
        title: "Success",
        description: "Patient deleted successfully!",
        variant: "default",
      });
    },
    onError: (error) => {
      console.log(error);
      toast({
        title: "Error",
        description: `Failed to delete patient: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleAddPatient = (patient: InsertPatient) => {
    if (user) {
      addPatientMutation.mutate({
        ...patient,
        userId: user.id,
      });
    }
  };

  const handleUpdatePatient = (patient: UpdatePatient & { id?: number }) => {
    if (currentPatient && user) {
      const { id, ...sanitizedPatient } = patient;
      updatePatientMutation.mutate({
        id: currentPatient.id,
        patient: sanitizedPatient,
      });
    } else {
      console.error("No current patient or user found for update");
      toast({
        title: "Error",
        description: "Cannot update patient: No patient or user found",
        variant: "destructive",
      });
    }
  };

  const handleEditPatient = (patient: Patient) => {
    setCurrentPatient(patient);
    setIsAddPatientOpen(true);
  };

  const handleViewPatient = (patient: Patient) => {
    setCurrentPatient(patient);
    setIsViewPatientOpen(true);
  };

  const handleDeletePatient = (patient: Patient) => {
    setCurrentPatient(patient);
    setIsDeletePatientOpen(true);
  };

  const handleConfirmDeletePatient = async () => {
    if (currentPatient) {
      deletePatientMutation.mutate(currentPatient.id);
    } else {
      toast({
        title: "Error",
        description: "No patient selected for deletion.",
        variant: "destructive",
      });
    }
  };

  const isLoading = isLoadingPatients || addPatientMutation.isPending || updatePatientMutation.isPending;

  // Search handling
  const handleSearch = (criteria: SearchCriteria) => {
    setSearchCriteria(criteria);
  };

  const handleClearSearch = () => {
    setSearchCriteria(null);
  };

  // Filter patients based on search criteria
  const filteredPatients = useMemo(() => {
    if (!searchCriteria || !searchCriteria.searchTerm) {
      return patients;
    }

    const term = searchCriteria.searchTerm.toLowerCase();
    return patients.filter((patient) => {
      switch (searchCriteria.searchBy) {
        case "name":
          return (
            patient.firstName.toLowerCase().includes(term) ||
            patient.lastName.toLowerCase().includes(term)
          );
        case "phone":
          return patient.phone.toLowerCase().includes(term);
        case "insuranceProvider":
          return patient.insuranceProvider?.toLowerCase().includes(term);
        case "insuranceId":
          return patient.insuranceId?.toLowerCase().includes(term);
        case "all":
        default:
          return (
            patient.firstName.toLowerCase().includes(term) ||
            patient.lastName.toLowerCase().includes(term) ||
            patient.phone.toLowerCase().includes(term) ||
            patient.email?.toLowerCase().includes(term) ||
            patient.address?.toLowerCase().includes(term) ||
            patient.city?.toLowerCase().includes(term) ||
            patient.insuranceProvider?.toLowerCase().includes(term) ||
            patient.insuranceId?.toLowerCase().includes(term)
          );
      }
    });
  }, [patients, searchCriteria]);


  // File upload handling
  const handleFileUpload = (file: File) => {
    setIsUploading(true); 
    setUploadedFile(file);

    toast({
      title: "File Selected",
      description: `${file.name} is ready for processing.`,
      variant: "default",
    });

    setIsUploading(false);
  };

  // data extraction
  const handleExtract = () =>{
    setIsExtracting(true);

    if (!uploadedFile){
       return toast({
        title: "Error",
        description:"Please upload a PDF",
        variant: "destructive",
      });
    }
    extractPdf(uploadedFile, {
      onSuccess: (data) => {
        setIsExtracting(false);

        toast({
        title: "Success Pdf Data Extracted",
        description: `Name: ${data.name}, Member ID: ${data.memberId}, DOB: ${data.dob}`,
        variant: "default",
      });

        setFormData({ PatientName: data.name || "", PatientMemberId: data.memberId || "",  PatientDob: data.dob || ""});
      },
    });
      
  };
  
  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopAppBar toggleMobileMenu={toggleMobileMenu} />

        <main className="flex-1 overflow-y-auto p-4">
          <div className="container mx-auto space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Patients</h1>
                <p className="text-muted-foreground">
                  Manage patient records and information
                </p>
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={() => {
                    setCurrentPatient(undefined);
                    setIsAddPatientOpen(true);
                  }}
                  className="gap-1"
                  disabled={isLoading}
                >
                  <Plus className="h-4 w-4" />
                  New Patient
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1"
                  onClick={() => refetchPatients()}
                  disabled={isLoading}
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>

            {/* File Upload Zone */}
            <div className="grid gap-4 md:grid-cols-4">
              <div className="md:col-span-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Upload Patient Document
                    </CardTitle>
                    <File className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <FileUploadZone
                      onFileUpload={handleFileUpload}
                      isUploading={isUploading}
                      acceptedFileTypes="application/pdf"
                    />
                  </CardContent>
                </Card>
              </div>
              <div className="md:col-span-1 flex items-end">
                <Button
                  className="w-full h-12 gap-2"
                  disabled={!uploadedFile || isExtracting}
                  onClick={handleExtract}
                >
                  {isExtracting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FilePlus className="h-4 w-4" />
                      Extract Info And Claim
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Patients Table */}
            <Card>
              <CardHeader>
                <CardTitle>Patient Records</CardTitle>
                <CardDescription>
                  View and manage all patient information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PatientSearch
                  onSearch={handleSearch}
                  onClearSearch={handleClearSearch}
                  isSearchActive={!!searchCriteria}
                />

                {searchCriteria && (
                  <div className="flex items-center my-4 px-2 py-1 bg-muted rounded-md text-sm">
                    <p>
                      Found {filteredPatients.length}
                      {filteredPatients.length === 1 ? " patient" : " patients"}
                      {searchCriteria.searchBy !== "all"
                        ? ` with ${searchCriteria.searchBy}`
                        : ""}
                      matching "{searchCriteria.searchTerm}"
                    </p>
                  </div>
                )}

                <PatientTable
                  patients={filteredPatients}
                  onEdit={handleEditPatient}
                  onView={handleViewPatient}
                  onDelete={handleDeletePatient}
                />

                <DeleteConfirmationDialog
                  isOpen={isDeletePatientOpen}
                  onConfirm={handleConfirmDeletePatient}
                  onCancel={() => setIsDeletePatientOpen(false)}
                  entityName={currentPatient?.name}
                />
              </CardContent>
            </Card>

            {/* View Patient Modal */}
            <Dialog open={isViewPatientOpen} onOpenChange={setIsViewPatientOpen}>
                    <DialogContent className="sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle>Patient Details</DialogTitle>
                        <DialogDescription>
                          Complete information about the patient.
                        </DialogDescription>
                      </DialogHeader>
            
                      {currentPatient && (
                        <div className="space-y-4">
                          <div className="flex items-center space-x-4">
                            <div className="h-16 w-16 rounded-full bg-primary text-white flex items-center justify-center text-xl font-medium">
                              {currentPatient.firstName.charAt(0)}
                              {currentPatient.lastName.charAt(0)}
                            </div>
                            <div>
                              <h3 className="text-xl font-semibold">
                                {currentPatient.firstName} {currentPatient.lastName}
                              </h3>
                              <p className="text-gray-500">
                                Patient ID: {currentPatient.id.toString().padStart(4, "0")}
                              </p>
                            </div>
                          </div>
            
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                            <div>
                              <h4 className="font-medium text-gray-900">
                                Personal Information
                              </h4>
                              <div className="mt-2 space-y-2">
                                <p>
                                  <span className="text-gray-500">Date of Birth:</span>{" "}
                                  {new Date(
                                    currentPatient.dateOfBirth
                                  ).toLocaleDateString()}
                                </p>
                                <p>
                                  <span className="text-gray-500">Gender:</span>{" "}
                                  {currentPatient.gender.charAt(0).toUpperCase() +
                                    currentPatient.gender.slice(1)}
                                </p>
                                <p>
                                  <span className="text-gray-500">Status:</span>{" "}
                                  <span
                                    className={`${
                                      currentPatient.status === "active"
                                        ? "text-green-600"
                                        : "text-amber-600"
                                    } font-medium`}
                                  >
                                    {currentPatient.status.charAt(0).toUpperCase() +
                                      currentPatient.status.slice(1)}
                                  </span>
                                </p>
                              </div>
                            </div>
            
                            <div>
                              <h4 className="font-medium text-gray-900">
                                Contact Information
                              </h4>
                              <div className="mt-2 space-y-2">
                                <p>
                                  <span className="text-gray-500">Phone:</span>{" "}
                                  {currentPatient.phone}
                                </p>
                                <p>
                                  <span className="text-gray-500">Email:</span>{" "}
                                  {currentPatient.email || "N/A"}
                                </p>
                                <p>
                                  <span className="text-gray-500">Address:</span>{" "}
                                  {currentPatient.address ? (
                                    <>
                                      {currentPatient.address}
                                      {currentPatient.city && `, ${currentPatient.city}`}
                                      {currentPatient.zipCode &&
                                        ` ${currentPatient.zipCode}`}
                                    </>
                                  ) : (
                                    "N/A"
                                  )}
                                </p>
                              </div>
                            </div>
            
                            <div>
                              <h4 className="font-medium text-gray-900">Insurance</h4>
                              <div className="mt-2 space-y-2">
                                <p>
                                  <span className="text-gray-500">Provider:</span>{" "}
                                  {currentPatient.insuranceProvider
                                    ? currentPatient.insuranceProvider === "delta"
                                      ? "Delta Dental"
                                      : currentPatient.insuranceProvider === "metlife"
                                        ? "MetLife"
                                        : currentPatient.insuranceProvider === "cigna"
                                          ? "Cigna"
                                          : currentPatient.insuranceProvider === "aetna"
                                            ? "Aetna"
                                            : currentPatient.insuranceProvider
                                    : "N/A"}
                                </p>
                                <p>
                                  <span className="text-gray-500">ID:</span>{" "}
                                  {currentPatient.insuranceId || "N/A"}
                                </p>
                                <p>
                                  <span className="text-gray-500">Group Number:</span>{" "}
                                  {currentPatient.groupNumber || "N/A"}
                                </p>
                                <p>
                                  <span className="text-gray-500">Policy Holder:</span>{" "}
                                  {currentPatient.policyHolder || "Self"}
                                </p>
                              </div>
                            </div>
            
                            <div>
                              <h4 className="font-medium text-gray-900">
                                Medical Information
                              </h4>
                              <div className="mt-2 space-y-2">
                                <p>
                                  <span className="text-gray-500">Allergies:</span>{" "}
                                  {currentPatient.allergies || "None reported"}
                                </p>
                                <p>
                                  <span className="text-gray-500">Medical Conditions:</span>{" "}
                                  {currentPatient.medicalConditions || "None reported"}
                                </p>
                              </div>
                            </div>
                          </div>
            
                          <div className="flex justify-end space-x-2 pt-4">
                            <Button
                              variant="outline"
                              onClick={() => setIsViewPatientOpen(false)}
                            >
                              Close
                            </Button>
                            <Button
                              onClick={() => {
                                setIsViewPatientOpen(false);
                                handleEditPatient(currentPatient);
                              }}
                            >
                              Edit Patient
                            </Button>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
            
            
            {/* Add/Edit Patient Modal */}
            <AddPatientModal
              ref={addPatientModalRef}
              open={isAddPatientOpen}
              onOpenChange={setIsAddPatientOpen}
              onSubmit={currentPatient ? handleUpdatePatient : handleAddPatient}
              isLoading={isLoading}
              patient={currentPatient}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
