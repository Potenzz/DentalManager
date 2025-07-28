import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { TopAppBar } from "@/components/layout/top-app-bar";
import { Sidebar } from "@/components/layout/sidebar";
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
import {
  PatientUncheckedCreateInputObjectSchema,
  AppointmentUncheckedCreateInputObjectSchema,
  ClaimUncheckedCreateInputObjectSchema,
} from "@repo/db/usedSchemas";
import { FileCheck } from "lucide-react";
import { parse } from "date-fns";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  setTaskStatus,
  clearTaskStatus,
} from "@/redux/slices/seleniumClaimSubmitTaskSlice";
import { SeleniumTaskBanner } from "@/components/ui/selenium-task-banner";
import { formatLocalDate, parseLocalDate } from "@/utils/dateUtils";
import ClaimsRecentTable from "@/components/claims/claims-recent-table";
import ClaimsOfPatientModal from "@/components/claims/claims-of-patient-table";

//creating types out of schema auto generated.
type Appointment = z.infer<typeof AppointmentUncheckedCreateInputObjectSchema>;
type Claim = z.infer<typeof ClaimUncheckedCreateInputObjectSchema>;

const insertAppointmentSchema = (
  AppointmentUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
).omit({
  id: true,
  createdAt: true,
});
type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

const updateAppointmentSchema = (
  AppointmentUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
)
  .omit({
    id: true,
    createdAt: true,
  })
  .partial();
type UpdateAppointment = z.infer<typeof updateAppointmentSchema>;

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

  // Fetch patients
  const { data: patients = [], isLoading: isLoadingPatients } = useQuery<
    Patient[]
  >({
    queryKey: ["/api/patients/"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/patients/");
      return res.json();
    },
    enabled: !!user,
  });

  // Fetch appointments
  const {
    data: appointments = [] as Appointment[],
    isLoading: isLoadingAppointments,
  } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments/all"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/appointments/all");
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
      queryClient.invalidateQueries({ queryKey: ["/api/patients/"] });
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
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Appointment created successfully.",
      });
      // Invalidate both appointments and patients queries
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients/"] });
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

  // workflow starts from there - this params are set by pdf extraction/patient page.
  // the fields are either send by pdfExtraction or by selecting patients.
  const [location] = useLocation();
  const { name, memberId, dob } = useMemo(() => {
    const search = window.location.search;
    const params = new URLSearchParams(search);
    return {
      name: params.get("name") || "",
      memberId: params.get("memberId") || "",
      dob: params.get("dob") || "",
    };
  }, [location]);

  const handleNewClaim = (patientId: number) => {
    setSelectedPatientId(patientId);
    setIsClaimFormOpen(true);
  };

  useEffect(() => {
    if (memberId && dob) {
      // if matching patient found then simply send its id to claim form,
      // if not then create new patient then send its id to claim form.
      const fetchMatchingPatient = async () => {
        try {
          const matchingPatient = await getPatientByInsuranceId(memberId);

          if (matchingPatient) {
            handleNewClaim(matchingPatient.id);
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
                handleNewClaim(created.id);
              },
            });
          }
        } catch (err) {
          console.error("Error checking/creating patient:", err);
        }
      };
      fetchMatchingPatient();
    }
  }, [memberId, dob]);

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

  // helper func for frontend
  const getDisplayProvider = (provider: string) => {
    const insuranceMap: Record<string, string> = {
      delta: "Delta Dental",
      metlife: "MetLife",
      cigna: "Cigna",
      aetna: "Aetna",
    };
    return insuranceMap[provider?.toLowerCase()] || provider;
  };

  // Get unique patients with appointments - might not needed now, can shift this to the recent patients table
  const patientsWithAppointments = patients.reduce(
    (acc, patient) => {
      const patientAppointments = appointments
        .filter((appt) => appt.patientId === patient.id)
        .sort(
          (a, b) =>
            parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime()
        ); // Sort descending by date

      if (patientAppointments.length > 0) {
        const latestAppointment = patientAppointments[0];
        acc.push({
          patientId: patient.id,
          patientName: `${patient.firstName} ${patient.lastName}`,
          appointmentId: latestAppointment!.id,
          insuranceProvider: patient.insuranceProvider || "N/A",
          insuranceId: patient.insuranceId || "N/A",
          lastAppointment: formatLocalDate(
            parseLocalDate(latestAppointment!.date)
          ),
        });
      }

      return acc;
    },
    [] as Array<{
      patientId: number;
      patientName: string;
      appointmentId: number;
      insuranceProvider: string;
      insuranceId: string;
      lastAppointment: string;
    }>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopAppBar toggleMobileMenu={toggleMobileMenu} />

        <SeleniumTaskBanner
          status={status}
          message={message}
          show={show}
          onClear={() => dispatch(clearTaskStatus())}
        />

        <main className="flex-1 overflow-y-auto p-4">
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

          {/* New Claims Section */}
          <div className="mb-8 mt-8">
            <div className="flex items-center justify-between mb-4">
              <div
                className="flex items-center cursor-pointer group"
                onClick={() => {
                  if (patientsWithAppointments.length > 0) {
                    const firstPatient = patientsWithAppointments[0];
                    handleNewClaim(Number(firstPatient?.patientId));
                  } else {
                    toast({
                      title: "No patients available",
                      description:
                        "There are no patients with appointments to create a claim",
                    });
                  }
                }}
              >
                <h2 className="text-xl font-medium text-gray-800 group-hover:text-primary">
                  New Claims
                </h2>
                <div className="ml-2 text-primary">
                  <FileCheck className="h-5 w-5" />
                </div>
              </div>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Recent Patients for Claims</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingPatients || isLoadingAppointments ? (
                  <div className="text-center py-4">
                    Loading patients data...
                  </div>
                ) : patientsWithAppointments.length > 0 ? (
                  <div className="divide-y">
                    {patientsWithAppointments.map(
                      (item: (typeof patientsWithAppointments)[number]) => (
                        <div
                          key={item.patientId}
                          className="py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                          onClick={() => handleNewClaim(item.patientId)}
                        >
                          <div>
                            <h3 className="font-medium">{item.patientName}</h3>
                            <div className="text-sm text-gray-500">
                              <span>
                                Insurance:{" "}
                                {getDisplayProvider(item.insuranceProvider)}
                              </span>

                              <span className="mx-2">•</span>
                              <span>ID: {item.insuranceId}</span>
                              <span className="mx-2">•</span>
                              <span>
                                Last Visit:{" "}
                                {parseLocalDate(
                                  item.lastAppointment
                                ).toLocaleDateString("en-CA")}
                              </span>
                            </div>
                          </div>
                          <div className="text-primary">
                            <FileCheck className="h-5 w-5" />
                          </div>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileCheck className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <h3 className="text-lg font-medium">
                      No eligible patients for claims
                    </h3>
                    <p className="text-gray-500 mt-1">
                      Patients with appointments will appear here for insurance
                      claim processing
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

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

          {/* Recent Claims by Patients */}
          <ClaimsOfPatientModal />
        </main>
      </div>

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
