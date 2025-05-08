import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { TopAppBar } from "../components/layout/top-app-bar";
import { Sidebar } from "../components/layout/sidebar";
import { StatCard } from "../components/ui/stat-card";
import { PatientTable } from "../components/patients/patient-table";
import { AddPatientModal } from "../components/patients/add-patient-modal";
import { AddAppointmentModal } from "../components/appointments/add-appointment-modal";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useToast } from "../hooks/use-toast";
import { useAuth } from "../hooks/use-auth";
import { apiRequest, queryClient } from "../lib/queryClient";
import { InsertPatient, Patient, UpdatePatient, Appointment, InsertAppointment, UpdateAppointment } from "@repo/db/schema";
import { Users, Calendar, CheckCircle, CreditCard, Plus, Clock } from "lucide-react";
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

export default function Dashboard() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [isViewPatientOpen, setIsViewPatientOpen] = useState(false);
  const [isAddAppointmentOpen, setIsAddAppointmentOpen] = useState(false);
  const [currentPatient, setCurrentPatient] = useState<Patient | undefined>(undefined);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | undefined>(undefined);
  
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch patients
  const { data: patients = [], isLoading: isLoadingPatients } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
    enabled: !!user,
  });
  
  // Fetch appointments
  const { 
    data: appointments = [] as Appointment[], 
    isLoading: isLoadingAppointments 
  } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
    enabled: !!user,
  });

  // Add patient mutation
  const addPatientMutation = useMutation({
    mutationFn: async (patient: InsertPatient) => {
      const res = await apiRequest("POST", "/api/patients", patient);
      return res.json();
    },
    onSuccess: () => {
      setIsAddPatientOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
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
  
  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (appointment: InsertAppointment) => {
      const res = await apiRequest("POST", "/api/appointments", appointment);
      return await res.json();
    },
    onSuccess: () => {
      setIsAddAppointmentOpen(false);
      toast({
        title: "Success",
        description: "Appointment created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
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
    mutationFn: async ({ id, appointment }: { id: number; appointment: UpdateAppointment }) => {
      const res = await apiRequest("PUT", `/api/appointments/${id}`, appointment);
      return await res.json();
    },
    onSuccess: () => {
      setIsAddAppointmentOpen(false);
      toast({
        title: "Success",
        description: "Appointment updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
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
  const handleAppointmentSubmit = (appointmentData: InsertAppointment | UpdateAppointment) => {
    if (selectedAppointment) {
      updateAppointmentMutation.mutate({
        id: selectedAppointment.id,
        appointment: appointmentData as UpdateAppointment,
      });
    } else {
      if (user) {
        createAppointmentMutation.mutate({
          ...appointmentData as InsertAppointment,
          userId: user.id,
        });
      }
    }
  };

  // Since we removed filters, just return all patients
  const filteredPatients = patients;
  
  // Get today's date in YYYY-MM-DD format
  const today = format(new Date(), 'yyyy-MM-dd');
  
  // Filter appointments for today
  const todaysAppointments = appointments.filter(
    (appointment) => appointment.date === today
  );
  
  // Count completed appointments today
  const completedTodayCount = todaysAppointments.filter(
    (appointment) => appointment.status === 'completed'
  ).length;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar isMobileOpen={isMobileMenuOpen} setIsMobileOpen={setIsMobileMenuOpen} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopAppBar toggleMobileMenu={toggleMobileMenu} />
        
        <main className="flex-1 overflow-y-auto p-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Total Patients"
              value={patients.length}
              icon={Users}
              color="primary"
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
              <h2 className="text-xl font-medium text-gray-800">Today's Appointments</h2>
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
                      const patient = patients.find(p => p.id === appointment.patientId);
                      return (
                        <div key={appointment.id} className="p-4 flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="h-10 w-10 rounded-full bg-primary bg-opacity-10 text-primary flex items-center justify-center">
                              <Clock className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="font-medium">
                                {patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient'}
                              </h3>
                              <div className="text-sm text-gray-500 flex items-center space-x-2">
                                <span>{appointment.startTime} - {appointment.endTime}</span>
                                <span>•</span>
                                <span>{appointment.type.charAt(0).toUpperCase() + appointment.type.slice(1)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                              ${appointment.status === 'completed' ? 'bg-green-100 text-green-800' : 
                                appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                                appointment.status === 'confirmed' ? 'bg-blue-100 text-blue-800' : 
                                'bg-yellow-100 text-yellow-800'}`}>
                              {appointment.status ? appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1) : 'Scheduled'}
                            </span>
                            <Link to="/appointments" className="text-primary hover:text-primary/80 text-sm">
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
                    <h3 className="text-lg font-medium text-gray-900">No appointments today</h3>
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
              <h2 className="text-xl font-medium text-gray-800">Patient Management</h2>
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

            {/* Search and filters removed */}
            
            {/* Patient Table */}
            <PatientTable 
              patients={filteredPatients} 
              onEdit={handleEditPatient} 
              onView={handleViewPatient} 
            />
          </div>
        </main>
      </div>

      {/* Add/Edit Patient Modal */}
      <AddPatientModal
        open={isAddPatientOpen}
        onOpenChange={setIsAddPatientOpen}
        onSubmit={currentPatient ? handleUpdatePatient : handleAddPatient}
        isLoading={addPatientMutation.isPending || updatePatientMutation.isPending}
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
                  {currentPatient.firstName.charAt(0)}{currentPatient.lastName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{currentPatient.firstName} {currentPatient.lastName}</h3>
                  <p className="text-gray-500">Patient ID: {currentPatient.id.toString().padStart(4, '0')}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div>
                  <h4 className="font-medium text-gray-900">Personal Information</h4>
                  <div className="mt-2 space-y-2">
                    <p>
                      <span className="text-gray-500">Date of Birth:</span>{' '}
                      {new Date(currentPatient.dateOfBirth).toLocaleDateString()}
                    </p>
                    <p>
                      <span className="text-gray-500">Gender:</span>{' '}
                      {currentPatient.gender.charAt(0).toUpperCase() + currentPatient.gender.slice(1)}
                    </p>
                    <p>
                      <span className="text-gray-500">Status:</span>{' '}
                      <span className={`${
                        currentPatient.status === 'active'
                          ? 'text-green-600'
                          : 'text-amber-600'
                      } font-medium`}>
                        {currentPatient.status.charAt(0).toUpperCase() + currentPatient.status.slice(1)}
                      </span>
                    </p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900">Contact Information</h4>
                  <div className="mt-2 space-y-2">
                    <p>
                      <span className="text-gray-500">Phone:</span>{' '}
                      {currentPatient.phone}
                    </p>
                    <p>
                      <span className="text-gray-500">Email:</span>{' '}
                      {currentPatient.email || 'N/A'}
                    </p>
                    <p>
                      <span className="text-gray-500">Address:</span>{' '}
                      {currentPatient.address ? (
                        <>
                          {currentPatient.address}
                          {currentPatient.city && `, ${currentPatient.city}`}
                          {currentPatient.zipCode && ` ${currentPatient.zipCode}`}
                        </>
                      ) : (
                        'N/A'
                      )}
                    </p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900">Insurance</h4>
                  <div className="mt-2 space-y-2">
                    <p>
                      <span className="text-gray-500">Provider:</span>{' '}
                      {currentPatient.insuranceProvider 
                        ? currentPatient.insuranceProvider === 'delta'
                          ? 'Delta Dental'
                          : currentPatient.insuranceProvider === 'metlife'
                          ? 'MetLife'
                          : currentPatient.insuranceProvider === 'cigna'
                          ? 'Cigna'
                          : currentPatient.insuranceProvider === 'aetna'
                          ? 'Aetna'
                          : currentPatient.insuranceProvider
                        : 'N/A'}
                    </p>
                    <p>
                      <span className="text-gray-500">ID:</span>{' '}
                      {currentPatient.insuranceId || 'N/A'}
                    </p>
                    <p>
                      <span className="text-gray-500">Group Number:</span>{' '}
                      {currentPatient.groupNumber || 'N/A'}
                    </p>
                    <p>
                      <span className="text-gray-500">Policy Holder:</span>{' '}
                      {currentPatient.policyHolder || 'Self'}
                    </p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900">Medical Information</h4>
                  <div className="mt-2 space-y-2">
                    <p>
                      <span className="text-gray-500">Allergies:</span>{' '}
                      {currentPatient.allergies || 'None reported'}
                    </p>
                    <p>
                      <span className="text-gray-500">Medical Conditions:</span>{' '}
                      {currentPatient.medicalConditions || 'None reported'}
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
        isLoading={createAppointmentMutation.isPending || updateAppointmentMutation.isPending}
        appointment={selectedAppointment}
        patients={patients}
      />
    </div>
  );
}
