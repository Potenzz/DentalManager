import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CheckCircle, LoaderCircleIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { PatientTable } from "@/components/patients/patient-table";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  setTaskStatus,
  clearTaskStatus,
} from "@/redux/slices/seleniumEligibilityCheckTaskSlice";
import { SeleniumTaskBanner } from "@/components/ui/selenium-task-banner";
import { formatLocalDate, parseLocalDate } from "@/utils/dateUtils";
import { InsertPatient, Patient } from "@repo/db/types";
import { DateInput } from "@/components/ui/dateInput";
import { QK_PATIENTS_BASE } from "@/components/patients/patient-table";
import { PdfPreviewModal } from "@/components/insurance-status/pdf-preview-modal";
import { useLocation } from "wouter";

export default function InsuranceStatusPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const { status, message, show } = useAppSelector(
    (state) => state.seleniumEligibilityCheckTask
  );
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [location] = useLocation();

  // Insurance eligibility and claim check form fields
  const [memberId, setMemberId] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isCheckingEligibilityStatus, setIsCheckingEligibilityStatus] =
    useState(false);
  const [isCheckingClaimStatus, setIsCheckingClaimStatus] = useState(false);

  // PDF preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPdfId, setPreviewPdfId] = useState<number | null>(null);
  const [previewFallbackFilename, setPreviewFallbackFilename] = useState<
    string | null
  >(null);

  // Populate fields from selected patient
  useEffect(() => {
    if (selectedPatient) {
      setMemberId(selectedPatient.insuranceId ?? "");
      setFirstName(selectedPatient.firstName ?? "");
      setLastName(selectedPatient.lastName ?? "");

      const dob =
        typeof selectedPatient.dateOfBirth === "string"
          ? parseLocalDate(selectedPatient.dateOfBirth)
          : selectedPatient.dateOfBirth;
      setDateOfBirth(dob);
    } else {
      setMemberId("");
      setFirstName("");
      setLastName("");
      setDateOfBirth(null);
    }
  }, [selectedPatient]);

  // Add patient mutation
  const addPatientMutation = useMutation({
    mutationFn: async (patient: InsertPatient) => {
      const res = await apiRequest("POST", "/api/patients/", patient);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK_PATIENTS_BASE });
      toast({
        title: "Success",
        description: "Patient added successfully!",
        variant: "default",
      });
    },
    onError: (error: any) => {
      const msg = error.message;

      if (msg === "A patient with this insurance ID already exists.") {
        toast({
          title: "Patient already exists",
          description: msg,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: `Failed to add patient: ${msg}`,
          variant: "destructive",
        });
      }
    },
  });

  // handle eligibility selenium
  const handleEligibilityCheckSelenium = async () => {
    const formattedDob = dateOfBirth ? formatLocalDate(dateOfBirth) : "";

    const data = {
      memberId,
      dateOfBirth: formattedDob,
      insuranceSiteKey: "MH",
    };
    try {
      dispatch(
        setTaskStatus({
          status: "pending",
          message: "Sending Data to Selenium...",
        })
      );
      const response = await apiRequest(
        "POST",
        "/api/insurance-status/eligibility-check",
        { data: JSON.stringify(data) }
      );
      const result = await response.json();
      if (result.error) throw new Error(result.error);

      dispatch(
        setTaskStatus({
          status: "success",
          message:
            "Patient status is updated, and its eligibility pdf is uploaded at Document Page.",
        })
      );

      toast({
        title: "Selenium service done.",
        description:
          "Your Patient Eligibility is fetched and updated, Kindly search through the patient.",
        variant: "default",
      });

      // If server returned pdfFileId: open preview modal
      if (result.pdfFileId) {
        setPreviewPdfId(Number(result.pdfFileId));
        // optional fallback name while header is parsed
        setPreviewFallbackFilename(
          result.pdfFilename ?? `eligibility_${memberId}.pdf`
        );
        setPreviewOpen(true);
      }
    } catch (error: any) {
      dispatch(
        setTaskStatus({
          status: "error",
          message: error.message || "Selenium submission failed",
        })
      );
      toast({
        title: "Selenium service error",
        description: error.message || "An error occurred.",
        variant: "destructive",
      });
    }
  };

  // Claim Status Check Selenium
  const handleStatusCheckSelenium = async () => {
    const formattedDob = dateOfBirth ? formatLocalDate(dateOfBirth) : "";

    const data = {
      memberId,
      dateOfBirth: formattedDob,
      insuranceSiteKey: "MH",
    };
    try {
      dispatch(
        setTaskStatus({
          status: "pending",
          message: "Sending Data to Selenium...",
        })
      );
      const response = await apiRequest(
        "POST",
        "/api/insurance-status/claim-status-check",
        { data: JSON.stringify(data) }
      );
      const result = await response.json();
      if (result.error) throw new Error(result.error);

      dispatch(
        setTaskStatus({
          status: "success",
          message:
            "Claim status is updated, and its pdf is uploaded at Document Page.",
        })
      );

      toast({
        title: "Selenium service done.",
        description:
          "Your Claim Status is fetched and updated, Kindly search through the patient.",
        variant: "default",
      });

      // If server returned pdfFileId: open preview modal
      if (result.pdfFileId) {
        setPreviewPdfId(Number(result.pdfFileId));
        // optional fallback name while header is parsed
        setPreviewFallbackFilename(
          result.pdfFilename ?? `eligibility_${memberId}.pdf`
        );
        setPreviewOpen(true);
      }
    } catch (error: any) {
      dispatch(
        setTaskStatus({
          status: "error",
          message: error.message || "Selenium submission failed",
        })
      );
      toast({
        title: "Selenium service error",
        description: error.message || "An error occurred.",
        variant: "destructive",
      });
    }
  };

  const handleAddPatient = async () => {
    const newPatient: InsertPatient = {
      firstName,
      lastName,
      dateOfBirth: dateOfBirth,
      gender: "",
      phone: "",
      userId: user?.id ?? 1,
      status: "active",
      insuranceId: memberId,
    };
    await addPatientMutation.mutateAsync(newPatient);
  };

  // Handle insurance provider eligibility button clicks
  const handleMHEligibilityButton = async () => {
    // Form Fields check
    if (!memberId || !dateOfBirth || !firstName) {
      toast({
        title: "Missing Fields",
        description:
          "Please fill in all the required fields: Member ID, Date of Birth, First Name.",
        variant: "destructive",
      });
      return;
    }

    setIsCheckingEligibilityStatus(true);

    // Adding patient if same patient exists then it will skip.
    try {
      if (!selectedPatient) {
        await handleAddPatient();
      }

      await handleEligibilityCheckSelenium();

      await queryClient.invalidateQueries({ queryKey: QK_PATIENTS_BASE });
    } finally {
      setIsCheckingEligibilityStatus(false);
    }
  };

  // Handle insurance provider Status Check button clicks
  const handleMHStatusButton = async () => {
    // Form Fields check
    if (!memberId || !dateOfBirth || !firstName) {
      toast({
        title: "Missing Fields",
        description:
          "Please fill in all the required fields: Member ID, Date of Birth, First Name.",
        variant: "destructive",
      });
      return;
    }

    setIsCheckingClaimStatus(true);

    // Adding patient if same patient exists then it will skip.
    try {
      if (!selectedPatient) {
        await handleAddPatient();
      }

      await handleStatusCheckSelenium();

      await queryClient.invalidateQueries({ queryKey: QK_PATIENTS_BASE });
    } finally {
      setIsCheckingClaimStatus(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const appointmentId = params.get("appointmentId");
    const action = params.get("action"); // 'eligibility' | 'claim'
    if (!appointmentId) return;
    const id = Number(appointmentId);
    if (Number.isNaN(id) || id <= 0) return;
    if (!action || (action !== "eligibility" && action !== "claim")) return;

    let cancelled = false;
    let inFlight = false;

    (async () => {
      try {
        const res = await apiRequest("GET", `/api/appointments/${id}/patient`);
        if (!res.ok) {
          let body: any = null;
          try {
            body = await res.json();
          } catch {}
          if (!cancelled) {
            toast({
              title: "Failed to load patient",
              description:
                body?.message ??
                body?.error ??
                `Could not fetch patient for appointment ${id}.`,
              variant: "destructive",
            });
          }
          return;
        }

        const data = await res.json();
        const patient = data?.patient ?? data;
        if (!cancelled && patient) {
          setSelectedPatient(patient as Patient);

          // populate the form state (so UI updates immediately)
          setMemberId(patient.insuranceId ?? "");
          setFirstName(patient.firstName ?? "");
          setLastName(patient.lastName ?? "");
          const parsedDob =
            patient?.dateOfBirth != null
              ? typeof patient.dateOfBirth === "string"
                ? parseLocalDate(patient.dateOfBirth)
                : patient.dateOfBirth
              : null;
          setDateOfBirth(parsedDob ?? null);

          // --- determine presence/validity from *patient* object (authoritative here) ---
          const memberIdVal =
            patient.insuranceId !== undefined &&
            patient.insuranceId !== null &&
            String(patient.insuranceId).trim() !== ""
              ? String(patient.insuranceId).trim()
              : "";

          const firstNameVal =
            patient.firstName !== undefined &&
            patient.firstName !== null &&
            String(patient.firstName).trim() !== ""
              ? String(patient.firstName).trim()
              : "";

          // DOB check: accept valid Date objects or parseable non-empty strings
          let dobIsValid = false;
          if (patient.dateOfBirth != null) {
            if (typeof patient.dateOfBirth === "string") {
              const d = parseLocalDate(patient.dateOfBirth);
              dobIsValid = d instanceof Date && !isNaN(d.getTime());
            } else if (patient.dateOfBirth instanceof Date) {
              dobIsValid = !isNaN(patient.dateOfBirth.getTime());
            } else {
              // some other format — treat as invalid
              dobIsValid = false;
            }
          }

          const missing: string[] = [];
          if (!memberIdVal) missing.push("Member ID");
          if (!firstNameVal) missing.push("First Name");
          if (!dobIsValid) missing.push("Date of Birth");

          if (missing.length > 0) {
            // show toast and DO NOT auto-run
            if (!cancelled) {
              toast({
                title: "Missing or invalid fields",
                description: `Cannot auto-run. Please provide: ${missing.join(", ")}.`,
                variant: "destructive",
              });
            }
            return;
          }

          // all required fields present — run the correct handler once
          setTimeout(async () => {
            if (cancelled) return;
            if (inFlight) return;
            inFlight = true;
            try {
              if (action === "eligibility") {
                await handleMHEligibilityButton();
              } else {
                await handleMHStatusButton();
              }
            } catch (err) {
              console.error("Auto MH action failed:", err);
            } finally {
              inFlight = false;
            }
          }, 0); // 0ms gives React a tick to flush state
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error("Error fetching patient for appointment:", err);
          toast({
            title: "Error",
            description:
              err?.message ?? "An error occurred while fetching patient.",
            variant: "destructive",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location]);

  return (
    <div>
      <SeleniumTaskBanner
        status={status}
        message={message}
        show={show}
        onClear={() => dispatch(clearTaskStatus())}
      />

      <div className="container mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Insurance Eligibility and Claim Status
            </h1>
            <p className="text-muted-foreground">
              Check insurance eligibility and Claim status.
            </p>
          </div>
        </div>

        {/* Insurance Eligibility Check Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Check Insurance Eligibility and Claim Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 md:grid-cols-4 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="memberId">Member ID</Label>
                <Input
                  id="memberId"
                  placeholder="Enter member ID"
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <DateInput
                  label="Date of Birth"
                  value={dateOfBirth}
                  onChange={setDateOfBirth}
                  disableFuture
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="Enter first name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Enter last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col-2 gap-4">
              <Button
                onClick={() => handleMHEligibilityButton()}
                className="w-full"
                disabled={isCheckingEligibilityStatus}
              >
                {isCheckingEligibilityStatus ? (
                  <>
                    <LoaderCircleIcon className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    MH Eligibility
                  </>
                )}
              </Button>

              <Button
                onClick={() => handleMHStatusButton()}
                className="w-full"
                disabled={isCheckingClaimStatus}
              >
                {isCheckingClaimStatus ? (
                  <>
                    <LoaderCircleIcon className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    MH Status
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Patients Table */}
        <Card>
          <CardHeader>
            <CardTitle>Patient Records</CardTitle>
            <CardDescription>
              Select Patients and Check Their Eligibility
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PatientTable
              allowView={true}
              allowDelete={true}
              allowCheckbox={true}
              allowEdit={true}
              onSelectPatient={setSelectedPatient}
            />
          </CardContent>
        </Card>
      </div>

      {/* Pdf preview modal */}
      <PdfPreviewModal
        open={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
          setPreviewPdfId(null);
          setPreviewFallbackFilename(null);
        }}
        pdfId={previewPdfId ?? undefined}
        fallbackFilename={previewFallbackFilename ?? undefined} // optional
      />
    </div>
  );
}
