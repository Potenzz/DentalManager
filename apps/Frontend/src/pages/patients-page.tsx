import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { PatientTable, qkPatients } from "@/components/patients/patient-table";
import { AddPatientModal } from "@/components/patients/add-patient-modal";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import useExtractPdfData from "@/hooks/use-extractPdfData";
import { useLocation } from "wouter";
import { InsertPatient, Patient } from "@repo/db/types";
import { QK_PATIENTS_BASE } from "@/components/patients/patient-table";

// Type for the ref to access modal methods
type AddPatientModalRef = {
  shouldSchedule: boolean;
  shouldClaim: boolean;
  navigateToSchedule: (patientId: number) => void;
  navigateToClaim: (patientId: number) => void;
};

export default function PatientsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [currentPatient, setCurrentPatient] = useState<Patient | undefined>(
    undefined
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const addPatientModalRef = useRef<AddPatientModalRef | null>(null);

  // File upload states
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const { mutate: extractPdf } = useExtractPdfData();
  const [location, navigate] = useLocation();

  // Add patient mutation
  const addPatientMutation = useMutation({
    mutationFn: async (patient: InsertPatient) => {
      const res = await apiRequest("POST", "/api/patients/", patient);
      return res.json();
    },
    onSuccess: (newPatient) => {
      setIsAddPatientOpen(false);
      queryClient.invalidateQueries({ queryKey: QK_PATIENTS_BASE });
      toast({
        title: "Success",
        description: "Patient added successfully!",
        variant: "default",
      });

      // ✅ Check claim first, then schedule
      if (addPatientModalRef.current?.shouldClaim) {
        addPatientModalRef.current.navigateToClaim(newPatient.id);
        return;
      }
      if (addPatientModalRef.current?.shouldSchedule) {
        addPatientModalRef.current.navigateToSchedule(newPatient.id);
        return;
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

  const isLoading = addPatientMutation.isPending;

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
  const handleExtract = () => {
    setIsExtracting(true);

    if (!uploadedFile) {
      return toast({
        title: "Error",
        description: "Please upload a PDF",
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

        const params = new URLSearchParams({
          name: data.name,
          memberId: data.memberId,
          dob: data.dob,
        });

        navigate(
          `/claims?name=${encodeURIComponent(data.name)}&memberId=${data.memberId}&dob=${data.dob}`
        );
      },
    });
  };

  return (
    <div>
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
          </div>
        </div>

        {/* File Upload Zone */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-medium text-gray-800">
              Upload Patient Document
            </h2>
          </div>
          <Card>
            <CardContent className="p-6 space-y-6">
              <FileUploadZone
                onFileUpload={handleFileUpload}
                isUploading={isUploading}
                acceptedFileTypes="application/pdf"
              />

              <div className="flex justify-end gap-4">
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
                      Extract Info & Claim/PreAuth
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
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
            <PatientTable
              allowDelete={true}
              allowEdit={true}
              allowView={true}
            />
          </CardContent>
        </Card>

        {/* Add/Edit Patient Modal */}
        <AddPatientModal
          ref={addPatientModalRef}
          open={isAddPatientOpen}
          onOpenChange={setIsAddPatientOpen}
          onSubmit={handleAddPatient}
          isLoading={isLoading}
          patient={currentPatient}
        />
      </div>
    </div>
  );
}
