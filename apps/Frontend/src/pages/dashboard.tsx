import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, parse } from "date-fns";
import { TopAppBar } from "@/components/layout/top-app-bar";
import { Sidebar } from "@/components/layout/sidebar";
import { StatCard } from "@/components/ui/stat-card";
import { PatientTable } from "@/components/patients/patient-table";
import { AddPatientModal } from "@/components/patients/add-patient-modal";
import { AddAppointmentModal } from "@/components/appointments/add-appointment-modal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  AppointmentUncheckedCreateInputObjectSchema,
  PatientUncheckedCreateInputObjectSchema,
} from "@repo/db/shared/schemas";
import {
  Users,
  Calendar,
  CheckCircle,
  CreditCard,
  Plus,
  Clock,
} from "lucide-react";
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { z } from "zod";
import { DeleteConfirmationDialog } from "@/components/ui/deleteDialog";

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

// Type for the ref to access modal methods
type AddPatientModalRef = {
  shouldSchedule: boolean;
  navigateToSchedule: (patientId: number) => void;
};

export default function Dashboard() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [isViewPatientOpen, setIsViewPatientOpen] = useState(false);
  const [isDeletePatientOpen, setIsDeletePatientOpen] = useState(false);
  const [isAddAppointmentOpen, setIsAddAppointmentOpen] = useState(false);
  const [currentPatient, setCurrentPatient] = useState<Patient | undefined>(
    undefined
  );
  const [selectedAppointment, setSelectedAppointment] = useState<
    Appointment | undefined
  >(undefined);

  const { toast } = useToast();
  const { user } = useAuth();
  const addPatientModalRef = useRef<AddPatientModalRef | null>(null);

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
      setIsAddPatientOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/patients/"] });
      toast({
        title: "Success",
        description: "Patient added successfully!",
        variant: "default",
      });

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

  const isLoading =
    isLoadingPatients ||
    addPatientMutation.isPending ||
    updatePatientMutation.isPending;

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (appointment: InsertAppointment) => {
      const res = await apiRequest("POST", "/api/appointments/", appointment);
      return await res.json();
    },
    onSuccess: () => {
      setIsAddAppointmentOpen(false);
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
      setIsAddAppointmentOpen(false);
      toast({
        title: "Success",
        description: "Appointment updated successfully.",
      });
      // Invalidate both appointments and patients queries
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

  // Handle appointment submission (create or update)
  const handleAppointmentSubmit = (
    appointmentData: InsertAppointment | UpdateAppointment
  ) => {
    if (selectedAppointment && typeof selectedAppointment.id === "number") {
      updateAppointmentMutation.mutate({
        id: selectedAppointment.id,
        appointment: appointmentData as UpdateAppointment,
      });
    } else {
      if (user) {
        createAppointmentMutation.mutate({
          ...(appointmentData as InsertAppointment),
          userId: user.id,
        });
      }
    }
  };

  // Since we removed filters, just return all patients
  const filteredPatients = patients;
  const today = format(new Date(), "yyyy-MM-dd");

  const todaysAppointments = appointments.filter((appointment) => {
    // Convert appointment.date to 'yyyy-MM-dd' string
    const dateStr =
      typeof appointment.date === "string"
        ? format(new Date(appointment.date), "yyyy-MM-dd")
        : format(appointment.date, "yyyy-MM-dd");

    return dateStr === today;
  });

  // Count completed appointments today
  const completedTodayCount = todaysAppointments.filter((appointment) => {
    return appointment.status === "completed";
  }).length;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopAppBar toggleMobileMenu={toggleMobileMenu} />

        <main className="flex-1 overflow-y-auto p-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Total Patients"
              value={patients.length}
              icon={Users}
              color="blue"
            />
            <StatCard
              title="Today's Appointments"
              value={todaysAppointments.length}
              icon={Calendar}
              color="secondary"
            />
            <StatCard
              title="Completed Today"
              value={completedTodayCount}
              icon={CheckCircle}
              color="success"
            />
            <StatCard
              title="Pending Payments"
              value={0}
              icon={CreditCard}
              color="warning"
            />
          </div>

          {/* Today's Appointments Section */}
          <div className="flex flex-col space-y-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <h2 className="text-xl font-medium text-gray-800">
                Today's Appointments
              </h2>
              <Button
                className="mt-2 md:mt-0"
                onClick={() => {
                  setSelectedAppointment(undefined);
                  setIsAddAppointmentOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Appointment
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                {todaysAppointments.length > 0 ? (
                  <div className="divide-y">
                    {todaysAppointments.map((appointment) => {
                      const patient = patients.find(
                        (p) => p.id === appointment.patientId
                      );
                      return (
                        <div
                          key={appointment.id}
                          className="p-4 flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="h-10 w-10 rounded-full bg-opacity-10 text-primary flex items-center justify-center">
                              <Clock className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="font-medium">
                                {patient
                                  ? `${patient.firstName} ${patient.lastName}`
                                  : "Unknown Patient"}
                              </h3>
                              <div className="text-sm text-gray-500 flex items-center space-x-2">
                                <span>
                                  <span>
                                    {`${format(
                                      parse(
                                        `${format(new Date(appointment.date), "yyyy-MM-dd")} ${appointment.startTime}`,
                                        "yyyy-MM-dd HH:mm",
                                        new Date()
                                      ),
                                      "hh:mm a"
                                    )} - ${format(
                                      parse(
                                        `${format(new Date(appointment.date), "yyyy-MM-dd")} ${appointment.endTime}`,
                                        "yyyy-MM-dd HH:mm",
                                        new Date()
                                      ),
                                      "hh:mm a"
                                    )}`}
                                  </span>
                                </span>
                                <span>•</span>
                                <span>
                                  {appointment.type.charAt(0).toUpperCase() +
                                    appointment.type.slice(1)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                              ${
                                appointment.status === "completed"
                                  ? "bg-green-100 text-green-800"
                                  : appointment.status === "cancelled"
                                    ? "bg-red-100 text-red-800"
                                    : appointment.status === "confirmed"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {appointment.status
                                ? appointment.status.charAt(0).toUpperCase() +
                                  appointment.status.slice(1)
                                : "Scheduled"}
                            </span>
                            <Link
                              to="/appointments"
                              className="text-primary hover:text-primary/80 text-sm"
                            >
                              View All
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                    <h3 className="text-lg font-medium text-gray-900">
                      No appointments today
                    </h3>
                    <p className="mt-1 text-gray-500">
                      You don't have any appointments scheduled for today.
                    </p>
                    <Button
                      className="mt-4"
                      onClick={() => {
                        setSelectedAppointment(undefined);
                        setIsAddAppointmentOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Schedule an Appointment
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Patient Management Section */}
          <div className="flex flex-col space-y-4">
            {/* Patient Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <h2 className="text-xl font-medium text-gray-800">
                Patient Management
              </h2>
              <Button
                className="mt-2 md:mt-0"
                onClick={() => {
                  setCurrentPatient(undefined);
                  setIsAddPatientOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Patient
              </Button>
            </div>

            {/* Patient Table */}
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
          </div>
        </main>
      </div>

      {/* Add/Edit Patient Modal */}
      <AddPatientModal
        ref={addPatientModalRef}
        open={isAddPatientOpen}
        onOpenChange={setIsAddPatientOpen}
        onSubmit={currentPatient ? handleUpdatePatient : handleAddPatient}
        isLoading={isLoading}
        patient={currentPatient}
      />

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
                      <span className="text-gray-500">Date of Birth:</span>{" "}
                      {format(
                        parse(
                          currentPatient.dateOfBirth,
                          "yyyy-MM-dd",
                          new Date()
                        ),
                        "PPP"
                      )}
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

      {/* Add/Edit Appointment Modal */}
      <AddAppointmentModal
        open={isAddAppointmentOpen}
        onOpenChange={setIsAddAppointmentOpen}
        onSubmit={handleAppointmentSubmit}
        isLoading={
          createAppointmentMutation.isPending ||
          updateAppointmentMutation.isPending
        }
        appointment={selectedAppointment}
        patients={patients}
      />
    </div>
  );
}
