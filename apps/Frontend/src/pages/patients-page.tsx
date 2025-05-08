import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { TopAppBar } from "../components/layout/top-app-bar";
import { Sidebar } from "../components/layout/sidebar";
import { PatientTable } from "../components/patients/patient-table";
import { AddPatientModal } from "../components/patients/add-patient-modal";
import { PatientSearch, SearchCriteria } from "../components/patients/patient-search";
import { FileUploadZone } from "../components/file-upload/file-upload-zone";
import { Button } from "../components/ui/button";
import { Plus, RefreshCw, File, FilePlus } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Patient, InsertPatient, UpdatePatient } from "@shared/schema";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useAuth } from "../hooks/use-auth";

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
  const [currentPatient, setCurrentPatient] = useState<Patient | undefined>(undefined);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria | null>(null);
  const addPatientModalRef = useRef<AddPatientModalRef | null>(null);
  
  // File upload states
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedInfo, setExtractedInfo] = useState<any>(null);

  // Fetch patients
  const {
    data: patients = [],
    isLoading: isLoadingPatients,
    refetch: refetchPatients,
  } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
    enabled: !!user,
  });

  // Add patient mutation
  const addPatientMutation = useMutation({
    mutationFn: async (patient: InsertPatient) => {
      const res = await apiRequest("POST", "/api/patients", patient);
      return res.json();
    },
    onSuccess: (newPatient) => {
      setIsAddPatientOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
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
    mutationFn: async ({ id, patient }: { id: number; patient: UpdatePatient }) => {
      const res = await apiRequest("PUT", `/api/patients/${id}`, patient);
      return res.json();
    },
    onSuccess: () => {
      setIsAddPatientOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
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

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleAddPatient = (patient: InsertPatient) => {
    // Add userId to the patient data
    if (user) {
      addPatientMutation.mutate({
        ...patient,
        userId: user.id
      });
    }
  };

  const handleUpdatePatient = (patient: UpdatePatient) => {
    if (currentPatient) {
      updatePatientMutation.mutate({ id: currentPatient.id, patient });
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

  const isLoading = isLoadingPatients || addPatientMutation.isPending || updatePatientMutation.isPending;
  
  // Search handling
  const handleSearch = (criteria: SearchCriteria) => {
    setSearchCriteria(criteria);
  };
  
  const handleClearSearch = () => {
    setSearchCriteria(null);
  };
  
  // File upload handling
  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    setIsUploading(false); // In a real implementation, this would be set to true during upload
    
    toast({
      title: "File Selected",
      description: `${file.name} is ready for processing.`,
      variant: "default",
    });
  };
  
  // Process file and extract patient information
  const handleExtractInfo = async () => {
    if (!uploadedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file first.",
        variant: "destructive",
      });
      return;
    }
    
    setIsExtracting(true);
    
    try {
      // Read the file as base64
      const reader = new FileReader();
      
      // Set up a Promise to handle file reading
      const fileReadPromise = new Promise<string>((resolve, reject) => {
        reader.onload = (event) => {
          if (event.target && typeof event.target.result === 'string') {
            resolve(event.target.result);
          } else {
            reject(new Error('Failed to read file as base64'));
          }
        };
        
        reader.onerror = () => {
          reject(new Error('Error reading file'));
        };
        
        // Read the file as a data URL (base64)
        reader.readAsDataURL(uploadedFile);
      });
      
      // Get the base64 data
      const base64Data = await fileReadPromise;
      
      // Send file to server as base64
      const response = await fetch('/api/upload-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdfData: base64Data,
          filename: uploadedFile.name
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Only keep firstName, lastName, dateOfBirth, and insuranceId from the extracted info
        const simplifiedInfo = {
          firstName: data.extractedInfo.firstName,
          lastName: data.extractedInfo.lastName,
          dateOfBirth: data.extractedInfo.dateOfBirth,
          insuranceId: data.extractedInfo.insuranceId
        };
        
        setExtractedInfo(simplifiedInfo);
        
        // Show success message
        toast({
          title: "Information Extracted",
          description: "Basic patient information (name, DOB, ID) has been extracted successfully.",
          variant: "default",
        });
        
        // Open patient form pre-filled with extracted data
        setCurrentPatient(undefined);
        
        // Pre-fill the form by opening the modal with the extracted information
        setTimeout(() => {
          setIsAddPatientOpen(true);
        }, 500);
        
      } else {
        throw new Error(data.message || "Failed to extract information");
      }
    } catch (error) {
      console.error("Error extracting information:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to extract information from file",
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
    }
  };
  
  // Filter patients based on search criteria
  const filteredPatients = useMemo(() => {
    if (!searchCriteria || !searchCriteria.searchTerm) {
      return patients;
    }
    
    const term = searchCriteria.searchTerm.toLowerCase();
    return patients.filter((patient) => {
      switch (searchCriteria.searchBy) {
        case 'name':
          return (
            patient.firstName.toLowerCase().includes(term) ||
            patient.lastName.toLowerCase().includes(term)
          );
        case 'phone':
          return patient.phone.toLowerCase().includes(term);
        case 'insuranceProvider':
          return patient.insuranceProvider?.toLowerCase().includes(term);
        case 'insuranceId':
          return patient.insuranceId?.toLowerCase().includes(term);
        case 'all':
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

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar isMobileOpen={isMobileMenuOpen} setIsMobileOpen={setIsMobileMenuOpen} />
      
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
                  onClick={handleExtractInfo} 
                  disabled={!uploadedFile || isExtracting}
                >
                  {isExtracting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FilePlus className="h-4 w-4" />
                      Extract Info
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
                      {filteredPatients.length === 1 ? ' patient' : ' patients'} 
                      {searchCriteria.searchBy !== 'all' ? ` with ${searchCriteria.searchBy}` : ''} 
                      matching "{searchCriteria.searchTerm}"
                    </p>
                  </div>
                )}
                
                <PatientTable
                  patients={filteredPatients}
                  onEdit={handleEditPatient}
                  onView={handleViewPatient}
                />
              </CardContent>
            </Card>

            {/* Add/Edit Patient Modal */}
            <AddPatientModal
              ref={addPatientModalRef}
              open={isAddPatientOpen}
              onOpenChange={setIsAddPatientOpen}
              onSubmit={currentPatient ? handleUpdatePatient : handleAddPatient}
              isLoading={isLoading}
              patient={currentPatient}
              // Pass extracted info as a separate prop to avoid triggering edit mode
              extractedInfo={!currentPatient && extractedInfo ? {
                firstName: extractedInfo.firstName || "",
                lastName: extractedInfo.lastName || "",
                dateOfBirth: extractedInfo.dateOfBirth || "",
                insuranceId: extractedInfo.insuranceId || ""
              } : undefined}
            />
          </div>
        </main>
      </div>
    </div>
  );
}