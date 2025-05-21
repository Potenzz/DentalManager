import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { TopAppBar } from "@/components/layout/top-app-bar";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ClaimForm } from "@/components/claims/claim-form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
// import { Patient, Appointment } from "@shared/schema";
import { PatientUncheckedCreateInputObjectSchema, AppointmentUncheckedCreateInputObjectSchema } from "@repo/db/shared/schemas";
import { Plus, FileCheck, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function ClaimsPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isClaimFormOpen, setIsClaimFormOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<number | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<number | null>(null);
  
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

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleNewClaim = (patientId: number, appointmentId: number) => {
    setSelectedPatient(patientId);
    setSelectedAppointment(appointmentId);
    setIsClaimFormOpen(true);
  };

  const closeClaim = () => {
    setIsClaimFormOpen(false);
    setSelectedPatient(null);
    setSelectedAppointment(null);
  };

  // Get unique patients with appointments
  const patientsWithAppointments = appointments.reduce((acc, appointment) => {
    if (!acc.some(item => item.patientId === appointment.patientId)) {
      const patient = patients.find(p => p.id === appointment.patientId);
      if (patient) {
        acc.push({
          patientId: patient.id,
          patientName: `${patient.firstName} ${patient.lastName}`,
          appointmentId: appointment.id,
          insuranceProvider: patient.insuranceProvider || 'N/A',
          insuranceId: patient.insuranceId || 'N/A',
          lastAppointment: appointment.date
        });
      }
    }
    return acc;
  }, [] as Array<{
    patientId: number;
    patientName: string;
    appointmentId: number;
    insuranceProvider: string;
    insuranceId: string;
    lastAppointment: string;
  }>);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar isMobileOpen={isMobileMenuOpen} setIsMobileOpen={setIsMobileMenuOpen} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopAppBar toggleMobileMenu={toggleMobileMenu} />
        
        <main className="flex-1 overflow-y-auto p-4">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-800">Insurance Claims</h1>
            <p className="text-gray-600">Manage and submit insurance claims for patients</p>
          </div>

          {/* New Claims Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div 
                className="flex items-center cursor-pointer group"
                onClick={() => {
                  if (patientsWithAppointments.length > 0) {
                    const firstPatient = patientsWithAppointments[0];
                    handleNewClaim(firstPatient.patientId, firstPatient.appointmentId);
                  } else {
                    toast({
                      title: "No patients available",
                      description: "There are no patients with appointments to create a claim",
                    });
                  }
                }}
              >
                <h2 className="text-xl font-medium text-gray-800 group-hover:text-primary">New Claims</h2>
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
                  <div className="text-center py-4">Loading patients data...</div>
                ) : patientsWithAppointments.length > 0 ? (
                  <div className="divide-y">
                    {patientsWithAppointments.map((item) => (
                      <div 
                        key={item.patientId} 
                        className="py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                        onClick={() => handleNewClaim(item.patientId, item.appointmentId)}
                      >
                        <div>
                          <h3 className="font-medium">{item.patientName}</h3>
                          <div className="text-sm text-gray-500">
                            <span>Insurance: {item.insuranceProvider === 'delta' 
                              ? 'Delta Dental' 
                              : item.insuranceProvider === 'metlife' 
                              ? 'MetLife' 
                              : item.insuranceProvider === 'cigna' 
                              ? 'Cigna' 
                              : item.insuranceProvider === 'aetna' 
                              ? 'Aetna' 
                              : item.insuranceProvider}</span>
                            <span className="mx-2">•</span>
                            <span>ID: {item.insuranceId}</span>
                            <span className="mx-2">•</span>
                            <span>Last Visit: {new Date(item.lastAppointment).toLocaleDateString()}</span>
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
                    <h3 className="text-lg font-medium">No eligible patients for claims</h3>
                    <p className="text-gray-500 mt-1">
                      Patients with appointments will appear here for insurance claim processing
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Old Claims Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-medium text-gray-800">Old Claims</h2>
            </div>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Submitted Claims History</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Sample Old Claims */}
                <div className="divide-y">
                  {patientsWithAppointments.slice(0, 3).map((item, index) => (
                    <div 
                      key={`old-claim-${index}`} 
                      className="py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                      onClick={() => toast({
                        title: "Claim Details",
                        description: `Viewing details for claim #${2000 + index}`
                      })}
                    >
                      <div>
                        <h3 className="font-medium">{item.patientName}</h3>
                        <div className="text-sm text-gray-500">
                          <span>Claim #: {2000 + index}</span>
                          <span className="mx-2">•</span>
                          <span>Submitted: {format(new Date(new Date().setDate(new Date().getDate() - (index * 15))), 'MMM dd, yyyy')}</span>
                          <span className="mx-2">•</span>
                          <span>Amount: ${(Math.floor(Math.random() * 500) + 100).toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          index === 0 ? 'bg-yellow-100 text-yellow-800' : 
                          index === 1 ? 'bg-green-100 text-green-800' : 
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {index === 0 ? (
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </span>
                          ) : index === 1 ? (
                            <span className="flex items-center">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approved
                            </span>
                          ) : (
                            <span className="flex items-center">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Review
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {patientsWithAppointments.length === 0 && (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                      <h3 className="text-lg font-medium">No claim history</h3>
                      <p className="text-gray-500 mt-1">
                        Submitted insurance claims will appear here
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Claim Form Modal */}
      {isClaimFormOpen && selectedPatient !== null && selectedAppointment !== null && (
        <ClaimForm
          patientId={selectedPatient}
          appointmentId={selectedAppointment}
          patientName=""  // Will be loaded by the component
          onClose={closeClaim}
        />
      )}
    </div>
  );
}