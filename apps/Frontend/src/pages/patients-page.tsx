import { useState, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { PatientTable } from "@/components/patients/patient-table";
import { AddPatientModal } from "@/components/patients/add-patient-modal";
import { FileUploadZone } from "@/components/file-upload/file-upload-zone";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, FilePlus } from "lucide-react";
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
import { parse } from "date-fns";
import { formatLocalDate } from "@/utils/dateUtils";

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

  // helper: ensure patient exists (returns patient object)
  const ensurePatientExists = async (data: {
    name: string;
    memberId: string;
    dob: string;
  }) => {
    try {
      // 1) try to find by insurance id
      const findRes = await apiRequest(
        "GET",
        `/api/patients/by-insurance-id?insuranceId=${encodeURIComponent(
          data.memberId
        )}`
      );
      if (findRes.ok) {
        const found = await findRes.json();
        if (found && found.id) return found;
      } else {
        // If API returns a non-ok with body, try to parse a possible 404-with-JSON
        try {
          const body = await findRes.json();
          if (body && body.id) return body;
        } catch {
          // ignore
        }
      }

      // 2) not found -> create patient
      const [firstName, ...rest] = (data.name || "").trim().split(" ");
      const lastName = rest.join(" ") || "";
      const parsedDob = parse(data.dob, "M/d/yyyy", new Date()); // robust for "4/17/1964", "12/1/1975", etc.

      // convert dob to whatever format your API expects. Here we keep as received.
      const newPatient: InsertPatient = {
        firstName: firstName || "",
        lastName: lastName || "",
        dateOfBirth: formatLocalDate(parsedDob),
        gender: "",
        phone: "",
        userId: user?.id ?? 1,
        status: "active",
        insuranceId: data.memberId || "",
      };

      const createRes = await apiRequest("POST", "/api/patients/", newPatient);
      if (!createRes.ok) {
        // surface error
        let body: any = null;
        try {
          body = await createRes.json();
        } catch {}
        throw new Error(
          body?.message ||
            `Failed to create patient (status ${createRes.status})`
        );
      }
      const created = await createRes.json();
      return created;
    } catch (err) {
      throw err;
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

  /**
   * Central helper:
   * - extracts PDF (awaits the mutate via a Promise wrapper),
   * - shows success toast,
   * - ensures patient exists (find by insuranceId, create if missing),
   * - shows toasts for errors,
   * - returns Patient on success or null on error.
   */
  const extractAndEnsurePatient =
    useCallback(async (): Promise<Patient | null> => {
      if (!uploadedFile) {
        toast({
          title: "Error",
          description: "Please upload a PDF",
          variant: "destructive",
        });
        return null;
      }

      setIsExtracting(true);
      try {
        // wrap the extractPdf mutate in a promise so we can await it
        const data: { name: string; memberId: string; dob: string } =
          await new Promise((resolve, reject) => {
            try {
              extractPdf(uploadedFile, {
                onSuccess: (d) => resolve(d as any),
                onError: (err: any) => reject(err),
              });
            } catch (err) {
              reject(err);
            }
          });

        // 2) basic validation of extracted data — require memberId + name (adjust if needed)
        if (!data?.memberId) {
          toast({
            title: "Extraction result invalid",
            description:
              "No memberId found in PDF — cannot find/create patient.",
            variant: "destructive",
          });
          return null;
        }
        if (!data?.name) {
          toast({
            title: "Extraction result invalid",
            description:
              "No patient name found in PDF — cannot create patient.",
            variant: "destructive",
          });
          return null;
        }
        if (!data.dob) {
          toast({
            title: "Extraction result invalid",
            description: "No DOB extracted — cannot create patient",
            variant: "default",
          });
        }

        // success toast for extraction
        toast({
          title: "Success Pdf Data Extracted",
          description: `Name: ${data.name}, Member ID: ${data.memberId}, DOB: ${data.dob}`,
          variant: "default",
        });

        // 1) try to find patient by insurance/memberId
        let findRes: Response | null = null;
        try {
          findRes = await apiRequest(
            "GET",
            `/api/patients/by-insurance-id?insuranceId=${encodeURIComponent(
              data.memberId
            )}`
          );
        } catch (err: any) {
          // Network / fetch error — do NOT attempt create; surface error and abort.
          toast({
            title: "Network error",
            description:
              err?.message ||
              "Unable to verify patient by insurance ID due to a network error. Try again.",
            variant: "destructive",
          });
          return null;
        }

        // 1a) handle fetch response
        if (findRes.ok) {
          try {
            const found = await findRes.json();
            if (found && found.id) {
              return found as Patient;
            }
            // If the API returned 200 but empty body / null, we'll treat as "not found" and go to create.
          } catch (err: any) {
            toast({
              title: "Error parsing response",
              description:
                err?.message ||
                "Unable to parse server response when checking existing patient.",
              variant: "destructive",
            });
            return null;
          }
        } else {
          // findRes is not ok
          if (findRes.status === 404) {
            // Not found -> proceed to create
          } else {
            // Other non-OK -> parse body if possible and abort (don't create)
            let body: any = null;
            try {
              body = await findRes.json();
            } catch {}
            toast({
              title: "Error checking patient",
              description:
                body?.message ||
                `Failed to check patient (status ${findRes.status}). Aborting.`,
              variant: "destructive",
            });
            return null;
          }
        }

        // 2) not found: create patient
        try {
          const [firstName, ...rest] = (data.name || "").trim().split(" ");
          const lastName = rest.join(" ") || "";
          const parsedDob = parse(data.dob, "M/d/yyyy", new Date()); // robust for "4/17/1964", "12/1/1975", etc.

          const newPatient: InsertPatient = {
            firstName: firstName || "",
            lastName: lastName || "",
            dateOfBirth: formatLocalDate(parsedDob),
            gender: "",
            phone: "",
            userId: user?.id ?? 1,
            status: "active",
            insuranceId: data.memberId || "",
          };

          const createRes = await apiRequest(
            "POST",
            "/api/patients/",
            newPatient
          );
          if (!createRes.ok) {
            let body: any = null;
            try {
              body = await createRes.json();
            } catch {}
            const msg =
              body?.message ||
              `Failed to create patient (status ${createRes.status})`;
            toast({
              title: "Error creating patient",
              description: msg,
              variant: "destructive",
            });
            return null;
          }
          const created = await createRes.json();

          // success toast already shown by addPatientMutation.onSuccess elsewhere — but we can also show a brief success here
          queryClient.invalidateQueries({ queryKey: QK_PATIENTS_BASE });

          toast({
            title: "Patient created",
            description: `${created.firstName || ""} ${created.lastName || ""} created.`,
            variant: "default",
          });
          return created as Patient;
        } catch (err: any) {
          toast({
            title: "Error creating patient",
            description: err?.message || "Failed to create patient.",
            variant: "destructive",
          });
          return null;
        }
      } catch (err: any) {
        // extraction error
        toast({
          title: "Extraction failed",
          description: err?.message ?? "Failed to extract data from PDF",
          variant: "destructive",
        });
        return null;
      } finally {
        setIsExtracting(false);
      }
    }, [uploadedFile, extractPdf]);

  // handlers are now minimal and don't repeat error/toast logic
  const handleExtractAndClaim = async () => {
    const patient = await extractAndEnsurePatient();
    if (!patient) return; // error already shown in helper
    navigate(`/claims?newPatient=${patient.id}`);
  };

  const handleExtractAndAppointment = async () => {
    const patient = await extractAndEnsurePatient();
    if (!patient) return;
    navigate(`/appointments?newPatient=${patient.id}`);
  };

  const handleExtractAndSave = async () => {
    await extractAndEnsurePatient();
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
        <div className="space-y-8 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Upload Patient Document</CardTitle>
              <CardDescription>
                You can upload 1 file. Allowed types: PDF
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUploadZone
                onFileUpload={handleFileUpload}
                isUploading={isUploading}
                acceptedFileTypes="application/pdf"
              />

              <div className="flex flex-col-2 gap-2 mt-4">
                <Button
                  className="w-full h-12 gap-2"
                  disabled={!uploadedFile || isExtracting}
                  onClick={handleExtractAndSave}
                >
                  {isExtracting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FilePlus className="h-4 w-4" />
                      Extract Info & Save
                    </>
                  )}
                </Button>
                <Button
                  className="w-full h-12 gap-2"
                  disabled={!uploadedFile || isExtracting}
                  onClick={handleExtractAndAppointment}
                >
                  {isExtracting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FilePlus className="h-4 w-4" />
                      Extract Info & Appointment
                    </>
                  )}
                </Button>
                <Button
                  className="w-full h-12 gap-2"
                  disabled={!uploadedFile || isExtracting}
                  onClick={handleExtractAndClaim}
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
