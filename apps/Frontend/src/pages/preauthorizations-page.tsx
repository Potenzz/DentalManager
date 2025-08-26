import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Plus, ClipboardCheck, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { Appointment, Patient } from "@repo/db/types";

export default function PreAuthorizationsPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPreAuthFormOpen, setIsPreAuthFormOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<number | null>(null);
  const [selectedProcedure, setSelectedProcedure] = useState<string | null>(null);
  
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

  const handleNewPreAuth = (patientId: number, procedure: string) => {
    setSelectedPatient(patientId);
    setSelectedProcedure(procedure);
    setIsPreAuthFormOpen(true);
    
    // Show a toast notification of success
    const patient = patients.find(p => p.id === patientId);
    toast({
      title: "Pre-authorization Request Started",
      description: `Started pre-auth for ${patient?.firstName} ${patient?.lastName} - ${procedure}`,
    });
  };

  // Common dental procedures requiring pre-authorization
  const dentalProcedures = [
    { code: "D2740", name: "Crown - porcelain/ceramic" },
    { code: "D2950", name: "Core buildup, including any pins" },
    { code: "D3330", name: "Root Canal - molar" },
    { code: "D4341", name: "Periodontal scaling & root planing" },
    { code: "D4910", name: "Periodontal maintenance" },
    { code: "D5110", name: "Complete denture - maxillary" },
    { code: "D6010", name: "Surgical placement of implant body" },
    { code: "D7240", name: "Removal of impacted tooth" },
  ];

  // Get patients with active insurance
  const patientsWithInsurance = patients.filter(patient => 
    patient.insuranceProvider && patient.insuranceId
  );

  // Sample pre-authorization data
  const samplePreAuths = [
    {
      id: "PA2023-001",
      patientId: patientsWithInsurance[0]?.id || 1,
      procedureCode: "D2740",
      procedureName: "Crown - porcelain/ceramic",
      requestDate: new Date(new Date().setDate(new Date().getDate() - 14)),
      status: "approved",
      approvalDate: new Date(new Date().setDate(new Date().getDate() - 7)),
      expirationDate: new Date(new Date().setMonth(new Date().getMonth() + 6)),
    },
    {
      id: "PA2023-002",
      patientId: patientsWithInsurance[0]?.id || 1,
      procedureCode: "D3330",
      procedureName: "Root Canal - molar",
      requestDate: new Date(new Date().setDate(new Date().getDate() - 5)),
      status: "pending",
      approvalDate: null,
      expirationDate: null,
    },
    {
      id: "PA2023-003",
      patientId: patientsWithInsurance[0]?.id || 1,
      procedureCode: "D7240",
      procedureName: "Removal of impacted tooth",
      requestDate: new Date(new Date().setDate(new Date().getDate() - 30)),
      status: "denied",
      approvalDate: null,
      expirationDate: null,
      denialReason: "Not medically necessary based on submitted documentation",
    }
  ];

  return (
    <div>
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-800">Pre-authorizations</h1>
            <p className="text-gray-600">Manage insurance pre-authorizations for dental procedures</p>
          </div>

          {/* New Pre-Authorization Request Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-medium text-gray-800">New Pre-Authorization Request</h2>
            </div>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Recent Patients for Pre-Authorization</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingPatients ? (
                  <div className="text-center py-4">Loading patients data...</div>
                ) : patientsWithInsurance.length > 0 ? (
                  <div className="divide-y">
                    {patientsWithInsurance.map((patient) => (
                      <div 
                        key={patient.id} 
                        className="py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                        onClick={() => {
                          setSelectedPatient(Number(patient.id));
                          handleNewPreAuth(
                            patient.id, 
                            dentalProcedures[Math.floor(Math.random() * 3)].name
                          );
                        }}
                      >
                        <div>
                          <h3 className="font-medium">{patient.firstName} {patient.lastName}</h3>
                          <div className="text-sm text-gray-500">
                            <span>Insurance: {patient.insuranceProvider === 'delta' 
                              ? 'Delta Dental' 
                              : patient.insuranceProvider === 'metlife' 
                              ? 'MetLife' 
                              : patient.insuranceProvider === 'cigna' 
                              ? 'Cigna' 
                              : patient.insuranceProvider === 'aetna' 
                              ? 'Aetna' 
                              : patient.insuranceProvider}</span>
                            <span className="mx-2">•</span>
                            <span>ID: {patient.insuranceId}</span>
                            <span className="mx-2">•</span>
                            <span>Procedure needed: {dentalProcedures[0].name}</span>
                          </div>
                        </div>
                        <div className="text-primary">
                          <ClipboardCheck className="h-5 w-5" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ClipboardCheck className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <h3 className="text-lg font-medium">No patients with insurance</h3>
                    <p className="text-gray-500 mt-1">
                      Add insurance information to patients to request pre-authorizations
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Pre-Authorization Submitted Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-medium text-gray-800">Pre-Authorization Submitted</h2>
            </div>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Pending Pre-Authorization Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {patientsWithInsurance.length > 0 ? (
                  <div className="divide-y">
                    {samplePreAuths.filter(auth => auth.status === 'pending').map((preAuth) => {
                      const patient = patients.find(p => p.id === preAuth.patientId) || 
                        { firstName: "Unknown", lastName: "Patient" };
                        
                      return (
                        <div 
                          key={preAuth.id} 
                          className="py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                          onClick={() => toast({
                            title: "Pre-Authorization Details",
                            description: `Viewing details for ${preAuth.id}`
                          })}
                        >
                          <div>
                            <h3 className="font-medium">{patient.firstName} {patient.lastName} - {preAuth.procedureName}</h3>
                            <div className="text-sm text-gray-500">
                              <span>ID: {preAuth.id}</span>
                              <span className="mx-2">•</span>
                              <span>Submitted: {format(preAuth.requestDate, 'MMM dd, yyyy')}</span>
                              <span className="mx-2">•</span>
                              <span>Expected Response: {format(new Date(preAuth.requestDate.getTime() + 7 * 24 * 60 * 60 * 1000), 'MMM dd, yyyy')}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                              <span className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    
                    {samplePreAuths.filter(auth => auth.status === 'pending').length === 0 && (
                      <div className="text-center py-8">
                        <Clock className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                        <h3 className="text-lg font-medium">No pending requests</h3>
                        <p className="text-gray-500 mt-1">
                          Submitted pre-authorization requests will appear here
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <h3 className="text-lg font-medium">No pre-authorization history</h3>
                    <p className="text-gray-500 mt-1">
                      Submitted pre-authorization requests will appear here
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Pre-Authorization Results Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-medium text-gray-800">Pre-Authorization Results</h2>
            </div>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Completed Pre-Authorization Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {patientsWithInsurance.length > 0 ? (
                  <div className="divide-y">
                    {samplePreAuths.filter(auth => auth.status !== 'pending').map((preAuth) => {
                      const patient = patients.find(p => p.id === preAuth.patientId) || 
                        { firstName: "Unknown", lastName: "Patient" };
                        
                      return (
                        <div 
                          key={preAuth.id} 
                          className="py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                          onClick={() => toast({
                            title: "Pre-Authorization Details",
                            description: `Viewing details for ${preAuth.id}`
                          })}
                        >
                          <div>
                            <h3 className="font-medium">{patient.firstName} {patient.lastName} - {preAuth.procedureName}</h3>
                            <div className="text-sm text-gray-500">
                              <span>ID: {preAuth.id}</span>
                              <span className="mx-2">•</span>
                              <span>Requested: {format(preAuth.requestDate, 'MMM dd, yyyy')}</span>
                              {preAuth.status === 'approved' && (
                                <>
                                  <span className="mx-2">•</span>
                                  <span>Expires: {format(preAuth.expirationDate as Date, 'MMM dd, yyyy')}</span>
                                </>
                              )}
                              {preAuth.status === 'denied' && preAuth.denialReason && (
                                <>
                                  <span className="mx-2">•</span>
                                  <span className="text-red-600">Reason: {preAuth.denialReason}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              preAuth.status === 'approved' ? 'bg-green-100 text-green-800' : 
                              'bg-red-100 text-red-800'
                            }`}>
                              {preAuth.status === 'approved' ? (
                                <span className="flex items-center">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Approved
                                </span>
                              ) : (
                                <span className="flex items-center">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Denied
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    
                    {samplePreAuths.filter(auth => auth.status !== 'pending').length === 0 && (
                      <div className="text-center py-8">
                        <CheckCircle className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                        <h3 className="text-lg font-medium">No completed requests</h3>
                        <p className="text-gray-500 mt-1">
                          Processed pre-authorization results will appear here
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <h3 className="text-lg font-medium">No pre-authorization results</h3>
                    <p className="text-gray-500 mt-1">
                      Completed pre-authorization requests will appear here
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
    </div>
  );
}