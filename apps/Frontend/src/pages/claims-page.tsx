import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { TopAppBar } from "@/components/layout/top-app-bar";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ClaimForm } from "@/components/claims/claim-form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  PatientUncheckedCreateInputObjectSchema,
  AppointmentUncheckedCreateInputObjectSchema,
} from "@repo/db/usedSchemas";
import { FileCheck, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

//creating types out of schema auto generated.
type Appointment = z.infer<typeof AppointmentUncheckedCreateInputObjectSchema>;

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
  const [selectedPatient, setSelectedPatient] = useState<number | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<number | null>(
    null
  );
  const { toast } = useToast();
  const { user } = useAuth();
  const [claimFormData, setClaimFormData] = useState<any>({
    patientId: null,
    serviceDate: "",
  });

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

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (appointment: InsertAppointment) => {
      const res = await apiRequest("POST", "/api/appointments/", appointment);
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

  // Update appointment mutation
    const updateAppointmentMutation = useMutation({
      mutationFn: async ({
        id,
        appointment,
      }: {
        id: number;
        appointment: UpdateAppointment;
      }) => {
        const res = await apiRequest(
          "PUT",
          `/api/appointments/${id}`,
          appointment
        );
        return await res.json();
      },
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Appointment updated successfully.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/appointments/all"] });
        queryClient.invalidateQueries({ queryKey: ["/api/patients/"] });
      },
      onError: (error: Error) => {
        toast({
          title: "Error",
          description: `Failed to update appointment: ${error.message}`,
          variant: "destructive",
        });
      },
    });
  
  const handleAppointmentSubmit = (
    appointmentData: InsertAppointment | UpdateAppointment
  ) => {
    // Converts local date to exact UTC date with no offset issues
    function parseLocalDate(dateInput: Date | string): Date {
      if (dateInput instanceof Date) return dateInput;

      const parts = dateInput.split("-");
      if (parts.length !== 3) {
        throw new Error(`Invalid date format: ${dateInput}`);
      }

      const year = Number(parts[0]);
      const month = Number(parts[1]);
      const day = Number(parts[2]);

      if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
        throw new Error(`Invalid date parts in date string: ${dateInput}`);
      }

      return new Date(year, month - 1, day); // month is 0-indexed
    }

    const rawDate = parseLocalDate(appointmentData.date);
    const formattedDate = rawDate.toLocaleDateString("en-CA"); // YYYY-MM-DD format

    // Prepare minimal data to update/create
    const minimalData = {
      date: rawDate.toLocaleDateString("en-CA"), // "YYYY-MM-DD" format
      startTime: appointmentData.startTime || "09:00",
      endTime: appointmentData.endTime || "09:30",
      staffId: appointmentData.staffId,
    };

    // Find existing appointment for this patient on the same date
    const existingAppointment = appointments.find(
      (a) =>
        a.patientId === appointmentData.patientId &&
        new Date(a.date).toLocaleDateString("en-CA") === formattedDate
    );

    if (existingAppointment && typeof existingAppointment.id === 'number') {
      // Update appointment with only date
      updateAppointmentMutation.mutate({
        id: existingAppointment.id,
        appointment: minimalData,
      });
    } else {
      // Create new appointment with required fields + defaults
      createAppointmentMutation.mutate({
        ...minimalData,
        patientId: appointmentData.patientId,
        userId:user?.id,
        title: "Scheduled Appointment", // default title
        type: "checkup", // default type
      } as InsertAppointment);
      
    }
  };

  const createClaimMutation = useMutation({
    mutationFn: async (claimData: any) => {
      const res = await apiRequest("POST", "/api/claims/", claimData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Claim submitted successfully",
        variant: "default",
      });
      closeClaim();
      // optionally refetch claims or appointments if needed
    },
    onError: (error: any) => {
      toast({
        title: "Error submitting claim",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const [location] = useLocation(); // gets path, e.g. "/claims"

  const { name, memberId, dob } = useMemo(() => {
    const search = window.location.search; // this gets the real query string
    const params = new URLSearchParams(search);
    return {
      name: params.get("name") || "",
      memberId: params.get("memberId") || "",
      dob: params.get("dob") || "",
    };
  }, [location]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleNewClaim = (patientId: number, appointmentId: number) => {
    setSelectedPatient(patientId);
    setSelectedAppointment(appointmentId);
    setIsClaimFormOpen(true);

    const patient = patients.find((p) => p.id === patientId);
    if (!patient) return;

    prefillClaimForm(patient);
  };

  const closeClaim = () => {
    setIsClaimFormOpen(false);
    setSelectedPatient(null);
    setSelectedAppointment(null);
    setClaimFormData({
      patientId: null,
      serviceDate: "",
    });
  };

  const prefillClaimForm = (patient: Patient) => {
    const lastAppointment = appointments.find(
      (a) => a.patientId === patient.id
    );

    setClaimFormData((prev: any) => ({
      ...prev,
      patientId: patient.id,
      serviceDate: lastAppointment
        ? new Date(lastAppointment.date).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    }));
  };

  useEffect(() => {
    if (memberId && dob) {
      const matchingPatient = patients.find(
        (p) =>
          p.insuranceId?.toLowerCase().trim() === memberId.toLowerCase().trim()
      );

      if (matchingPatient) {
        setSelectedPatient(matchingPatient.id);
        prefillClaimForm(matchingPatient);
        setIsClaimFormOpen(true);
      } else {
        const [firstName, ...rest] = name.trim().split(" ");
        const lastName = rest.join(" ") || "";

        const parsedDob = new Date(dob);
        const isValidDob = !isNaN(parsedDob.getTime());

        const newPatient: InsertPatient = {
          firstName,
          lastName,
          dateOfBirth: isValidDob ? parsedDob : new Date(),
          gender: "",
          phone: "",
          userId: user?.id ?? 1,
          status: "active",
          insuranceId: memberId,
        };

        addPatientMutation.mutate(newPatient, {
          onSuccess: (created) => {
            setSelectedPatient(created.id);
            prefillClaimForm(created);
            setIsClaimFormOpen(true);
          },
        });
      }
    }
  }, [memberId, dob, patients]);

  function handleClaimSubmit(claimData: any) {
    createClaimMutation.mutate(claimData);
  }

  const getDisplayProvider = (provider: string) => {
    const insuranceMap: Record<string, string> = {
      delta: "Delta Dental",
      metlife: "MetLife",
      cigna: "Cigna",
      aetna: "Aetna",
    };
    return insuranceMap[provider?.toLowerCase()] || provider;
  };

  // Get unique patients with appointments
  const patientsWithAppointments = appointments.reduce(
    (acc, appointment) => {
      if (!acc.some((item) => item.patientId === appointment.patientId)) {
        const patient = patients.find((p) => p.id === appointment.patientId);
        if (patient) {
          acc.push({
            patientId: patient.id,
            patientName: `${patient.firstName} ${patient.lastName}`,
            appointmentId: Number(appointment.id),
            insuranceProvider: patient.insuranceProvider || "N/A",
            insuranceId: patient.insuranceId || "N/A",
            lastAppointment: String(appointment.date),
          });
        }
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

        <main className="flex-1 overflow-y-auto p-4">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-800">
              Insurance Claims
            </h1>
            <p className="text-gray-600">
              Manage and submit insurance claims for patients
            </p>
          </div>

          {/* New Claims Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div
                className="flex items-center cursor-pointer group"
                onClick={() => {
                  if (patientsWithAppointments.length > 0) {
                    const firstPatient = patientsWithAppointments[0];
                    handleNewClaim(
                      Number(firstPatient?.patientId),
                      Number(firstPatient?.appointmentId)
                    );
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
                    {patientsWithAppointments.map((item) => (
                      <div
                        key={item.patientId}
                        className="py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                        onClick={() =>
                          handleNewClaim(item.patientId, item.appointmentId)
                        }
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
                              {new Date(
                                item.lastAppointment
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="text-primary">
                          <FileCheck className="h-5 w-5" />
                        </div>
                      </div>
                    ))}
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
        </main>
      </div>

      {/* Claim Form Modal */}
      {isClaimFormOpen && selectedPatient !== null && (
        <ClaimForm
          patientId={selectedPatient}
          onClose={closeClaim}
          extractedData={claimFormData}
          onSubmit={handleClaimSubmit}
          onHandleAppointmentSubmit={handleAppointmentSubmit}
        />
      )}
    </div>
  );
}
