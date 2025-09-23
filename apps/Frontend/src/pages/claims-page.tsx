import { useState, useEffect, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { ClaimForm } from "@/components/claims/claim-form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { parse } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  setTaskStatus,
  clearTaskStatus,
} from "@/redux/slices/seleniumClaimSubmitTaskSlice";
import { SeleniumTaskBanner } from "@/components/ui/selenium-task-banner";
import { formatLocalDate } from "@/utils/dateUtils";
import ClaimsRecentTable, {
  QK_CLAIMS_BASE,
} from "@/components/claims/claims-recent-table";
import ClaimsOfPatientModal from "@/components/claims/claims-of-patient-table";
import {
  Claim,
  InsertAppointment,
  InsertPatient,
  UpdateAppointment,
  UpdatePatient,
} from "@repo/db/types";
import ClaimDocumentsUploadMultiple from "@/components/claims/claim-document-upload-modal";

export default function ClaimsPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isClaimFormOpen, setIsClaimFormOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(
    null
  );
  const dispatch = useAppDispatch();
  const { status, message, show } = useAppSelector(
    (state) => state.seleniumClaimSubmitTask
  );
  const { toast } = useToast();
  const { user } = useAuth();
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Add patient mutation
  const addPatientMutation = useMutation({
    mutationFn: async (patient: InsertPatient) => {
      const res = await apiRequest("POST", "/api/patients/", patient);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Patient added successfully!",
        variant: "default",
      });
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

  // Create/upsert appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (appointment: InsertAppointment) => {
      const res = await apiRequest(
        "POST",
        "/api/appointments/upsert",
        appointment
      );
      return await res.json();
    },
    onSuccess: (appointment) => {
      toast({
        title: "Appointment Scheduled",
        description: appointment.message || "Appointment created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create appointment: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // create claim mutation
  const createClaimMutation = useMutation({
    mutationFn: async (claimData: any) => {
      const res = await apiRequest("POST", "/api/claims/", claimData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK_CLAIMS_BASE });

      toast({
        title: "Claim created successfully",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error submitting claim",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // helpers
  const getPatientByInsuranceId = async (insuranceId: string) => {
    const res = await apiRequest(
      "GET",
      `/api/patients/by-insurance-id?insuranceId=${encodeURIComponent(insuranceId)}`
    );

    if (!res.ok) {
      throw new Error(
        `Failed to fetch patient by insuranceId (status ${res.status})`
      );
    }

    return res.json();
  };

  // small helper: remove given query params from the current URL (silent, no reload)
  const clearUrlParams = (params: string[]) => {
    try {
      const url = new URL(window.location.href);
      let changed = false;
      for (const p of params) {
        if (url.searchParams.has(p)) {
          url.searchParams.delete(p);
          changed = true;
        }
      }
      if (changed) {
        window.history.replaceState({}, document.title, url.toString());
      }
    } catch (e) {
      // ignore (URL API or history.replaceState might throw in very old envs)
    }
  };

  // case1: - this params are set by pdf extraction/patient page. then used in claim page here.
  const [location] = useLocation();
  const { name, memberId, dob, newPatient } = useMemo(() => {
    const search = window.location.search;
    const params = new URLSearchParams(search);
    return {
      newPatient: params.get("newPatient"),
      name: params.get("name") || "",
      memberId: params.get("memberId") || "",
      dob: params.get("dob") || "",
    };
  }, [location]);

  const handleNewClaim = (patientId: number) => {
    setSelectedPatientId(patientId);
    setIsClaimFormOpen(true);
  };

  //  case2: redirect from patient-add-form. if ?newPatient=<id> is present, open claim form directly
  useEffect(() => {
    if (!newPatient) return;

    const id = Number(newPatient);
    if (!Number.isFinite(id) || id <= 0) return;

    handleNewClaim(id);
    clearUrlParams(["newPatient"]);
  }, [newPatient]);

  // case3: only runs when there is no ?newPatient and we have memberId+dob
  useEffect(() => {
    if (!memberId || !dob) return;

    let cancelled = false;

    // if matching patient found then simply send its id to claim form,
    // if not then create new patient then send its id to claim form.
    const fetchMatchingPatient = async () => {
      try {
        const matchingPatient = await getPatientByInsuranceId(memberId);

        if (cancelled) return;

        if (matchingPatient) {
          handleNewClaim(matchingPatient.id);
          clearUrlParams(["memberId", "dob", "name"]);
        } else {
          const [firstName, ...rest] = name.trim().split(" ");
          const lastName = rest.join(" ") || "";
          const parsedDob = parse(dob, "M/d/yyyy", new Date()); // robust for "4/17/1964", "12/1/1975", etc.

          const newPatient: InsertPatient = {
            firstName,
            lastName,
            dateOfBirth: formatLocalDate(parsedDob),
            gender: "",
            phone: "",
            userId: user?.id ?? 1,
            status: "active",
            insuranceId: memberId,
          };

          addPatientMutation.mutate(newPatient, {
            onSuccess: (created) => {
              if (cancelled) return;
              handleNewClaim(created.id);
              clearUrlParams(["memberId", "dob", "name"]);
            },
          });
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Error checking/creating patient:", err);
          toast({
            title: "Error",
            description: "Error checking/creating patient from URL params.",
            variant: "destructive",
          });
        }
      }
    };

    fetchMatchingPatient();

    return () => {
      cancelled = true;
    };
  }, [memberId]);

  // case4 - redirect from appointment page:
  // If ?appointmentId= is present (and no ?newPatient param), fetch appointment->patient and open claim form
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const appointmentIdParam = params.get("appointmentId");

    // If newPatient flow is present, prefer it and do nothing here
    if (newPatient) return;
    if (!appointmentIdParam) return;

    const appointmentId = Number(appointmentIdParam);
    if (!Number.isFinite(appointmentId) || appointmentId <= 0) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await apiRequest(
          "GET",
          `/api/appointments/${appointmentId}/patient`
        );
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
                `Could not fetch patient for appointment ${appointmentId}.`,
              variant: "destructive",
            });
          }
          return;
        }

        const data = await res.json();
        const patient = data?.patient ?? data;
        if (!cancelled && patient && patient.id) {
          handleNewClaim(patient.id);
          clearUrlParams(["appointmentId"]);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error("Error fetching patient for appointment:", err);
          toast({
            title: "Error",
            description: err?.message ?? "Failed to fetch patient.",
            variant: "destructive",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location, newPatient]);

  // 1. upsert appointment.
  const handleAppointmentSubmit = async (
    appointmentData: InsertAppointment | UpdateAppointment
  ): Promise<number> => {
    return new Promise<number>((resolve, reject) => {
      createAppointmentMutation.mutate(
        {
          date: appointmentData.date,
          startTime: "09:00",
          endTime: "09:30",
          staffId: appointmentData.staffId,
          patientId: appointmentData.patientId,
          userId: user?.id,
          title: "Scheduled Appointment",
          type: "checkup",
        },
        {
          onSuccess: (appointment) => {
            resolve(appointment.id);
          },
          onError: (error) => {
            toast({
              title: "Error",
              description: "Could not schedule appointment",
              variant: "destructive",
            });
            reject(error);
          },
        }
      );
    });
  };

  // 2. Update Patient ( for insuranceId and Insurance Provider)
  const handleUpdatePatient = (patient: UpdatePatient & { id?: number }) => {
    if (patient) {
      const { id, ...sanitizedPatient } = patient;
      updatePatientMutation.mutate({
        id: Number(patient.id),
        patient: sanitizedPatient,
      });
    } else {
      toast({
        title: "Error",
        description: "Cannot update patient: No patient or user found",
        variant: "destructive",
      });
    }
  };

  // 3. create claim.
  const handleClaimSubmit = (claimData: any): Promise<Claim> => {
    return createClaimMutation.mutateAsync(claimData).then((data) => {
      return data;
    });
  };

  // 4. handle selenium sybmiting Mass Health claim
  const handleMHClaimSubmitSelenium = async (data: any) => {
    const formData = new FormData();
    formData.append("data", JSON.stringify(data));
    const uploadedFiles: File[] = data.uploadedFiles ?? [];

    uploadedFiles.forEach((file: File) => {
      if (file.type === "application/pdf") {
        formData.append("pdfs", file);
      } else if (file.type.startsWith("image/")) {
        formData.append("images", file);
      }
    });

    try {
      dispatch(
        setTaskStatus({
          status: "pending",
          message: "Submitting claim to Selenium...",
        })
      );
      const response = await apiRequest(
        "POST",
        "/api/claims/selenium",
        formData
      );
      const result1 = await response.json();
      if (result1.error) throw new Error(result1.error);

      dispatch(
        setTaskStatus({
          status: "pending",
          message: "Submitted to Selenium. Awaiting PDF...",
        })
      );

      toast({
        title: "Selenium service notified",
        description:
          "Your claim data was successfully sent to Selenium, Waitinig for its response.",
        variant: "default",
      });

      const result2 = await handleMHSeleniumPdfDownload(
        result1,
        selectedPatientId
      );
      return result2;
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

  // 5. selenium pdf download handler
  const handleMHSeleniumPdfDownload = async (
    data: any,
    selectedPatientId: number | null
  ) => {
    try {
      if (!selectedPatientId) {
        throw new Error("Missing patientId");
      }

      dispatch(
        setTaskStatus({
          status: "pending",
          message: "Downloading PDF from Selenium...",
        })
      );

      const res = await apiRequest("POST", "/api/claims/selenium/fetchpdf", {
        patientId: selectedPatientId,
        pdf_url: data.pdf_url,
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);

      dispatch(
        setTaskStatus({
          status: "success",
          message: "Claim submitted & PDF downloaded successfully.",
        })
      );

      toast({
        title: "Success",
        description: "Claim Submitted and Pdf Downloaded completed.",
      });

      return result;
    } catch (error: any) {
      dispatch(
        setTaskStatus({
          status: "error",
          message: error.message || "Failed to download PDF",
        })
      );
      toast({
        title: "Error",
        description: error.message || "Failed to fetch PDF",
        variant: "destructive",
      });
    }
  };

  // 6. close claim
  const closeClaim = () => {
    setSelectedPatientId(null);
    setIsClaimFormOpen(false);

    // Remove query parameters without reload
    const url = new URL(window.location.href);
    url.searchParams.delete("memberId");
    url.searchParams.delete("dob");
    url.searchParams.delete("name");

    // Use history.replaceState to update the URL without reloading
    window.history.replaceState({}, document.title, url.toString());
  };

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
              Insurance Claims
            </h1>
            <p className="text-muted-foreground">
              Manage and submit insurance claims for patients
            </p>
          </div>
        </div>
      </div>

      {/* Recent Claims by Patients also handles new claims */}
      <ClaimsOfPatientModal onNewClaim={handleNewClaim} />

      {/* Recent Claims Section */}
      <Card>
        <CardHeader>
          <CardTitle>Recently Submitted Claims</CardTitle>
          <CardDescription>
            View and manage all recent claims information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClaimsRecentTable
            allowEdit={true}
            allowView={true}
            allowDelete={true}
          />
        </CardContent>
      </Card>

      {/* File Upload Zone */}
      <ClaimDocumentsUploadMultiple />

      {/* Claim Form Modal */}
      {isClaimFormOpen && selectedPatientId !== null && (
        <ClaimForm
          patientId={selectedPatientId}
          onClose={closeClaim}
          onSubmit={handleClaimSubmit}
          onHandleAppointmentSubmit={handleAppointmentSubmit}
          onHandleUpdatePatient={handleUpdatePatient}
          onHandleForMHSelenium={handleMHClaimSubmitSelenium}
        />
      )}
    </div>
  );
}
