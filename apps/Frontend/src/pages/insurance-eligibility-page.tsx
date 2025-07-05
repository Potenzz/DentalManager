import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { TopAppBar } from "@/components/layout/top-app-bar";
import { Sidebar } from "@/components/layout/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Search, 
  Edit, 
  Eye, 
  ChevronLeft, 
  ChevronRight,
  Settings,
  CheckCircle
} from "lucide-react";
import { PatientUncheckedCreateInputObjectSchema } from "@repo/db/usedSchemas";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { CredentialsModal } from "@/components/insurance/credentials-modal";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {z} from 'zod';

const PatientSchema = (
  PatientUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
).omit({
  appointments: true,
});
type Patient = z.infer<typeof PatientSchema>;

export default function InsuranceEligibilityPage() {
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  // Insurance eligibility check form fields
  const [memberId, setMemberId] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  
  // Selected patient for insurance check
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  
  // Insurance automation states
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("");
  const { toast } = useToast();

  // Insurance eligibility check mutation
  const checkInsuranceMutation = useMutation({
    mutationFn: async ({ provider, patientId, credentials }: {
      provider: string;
      patientId: number;
      credentials: { username: string; password: string };
    }) => {
      const response = await fetch('/api/insurance/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider, patientId, credentials }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to check insurance');
      }
      
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Insurance Check Complete",
        description: result.isEligible ? 
          `Patient is eligible. Plan: ${result.planName}` : 
          "Patient eligibility could not be verified",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Insurance Check Failed",
        description: error.message || "Unable to verify insurance eligibility",
        variant: "destructive",
      });
    },
  });

  // Fetch patients
  const {
    data: patients = [],
    isLoading: isLoadingPatients,
  } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
    enabled: !!user,
  });

  // Filter patients based on search
  const filteredPatients = patients.filter(patient => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
    const patientId = `PID-${patient.id.toString().padStart(4, '0')}`;
    
    switch (searchField) {
      case "name":
        return fullName.includes(searchLower);
      case "id":
        return patientId.toLowerCase().includes(searchLower);
      case "phone":
        return patient.phone?.toLowerCase().includes(searchLower) || false;
      case "all":
      default:
        return (
          fullName.includes(searchLower) ||
          patientId.toLowerCase().includes(searchLower) ||
          patient.phone?.toLowerCase().includes(searchLower) ||
          patient.email?.toLowerCase().includes(searchLower) ||
          false
        );
    }
  });

  // Pagination
  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPatients = filteredPatients.slice(startIndex, endIndex);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getPatientInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Toggle patient selection
  const togglePatientSelection = (patientId: number) => {
    setSelectedPatientId(selectedPatientId === patientId ? null : patientId);
  };

  // Handle insurance provider button clicks
  const handleProviderClick = (providerName: string) => {
    if (!selectedPatientId) {
      toast({
        title: "No Patient Selected",
        description: "Please select a patient first by checking the box next to their name.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedProvider(providerName);
    setIsCredentialsModalOpen(true);
  };

  // Handle credentials submission and start automation
  const handleCredentialsSubmit = (credentials: { username: string; password: string }) => {
    if (selectedPatientId && selectedProvider) {
      // Use the provided MH credentials for MH provider
      const finalCredentials = selectedProvider.toLowerCase() === 'mh' ? {
        username: 'kqkgaox@yahoo.com',
        password: 'Lex123456'
      } : credentials;

      checkInsuranceMutation.mutate({
        provider: selectedProvider,
        patientId: selectedPatientId,
        credentials: finalCredentials,
      });
    }
    setIsCredentialsModalOpen(false);
  };

  const handleEligibilityCheck = () => {
    // TODO: Implement insurance eligibility check
    console.log("Checking MH eligibility:", { memberId, dateOfBirth, firstName, lastName });
  };

  const handleDeltaMACheck = () => {
    // TODO: Implement Delta MA eligibility check
    console.log("Checking Delta MA eligibility:", { memberId, dateOfBirth, firstName, lastName });
  };

  const handleMetlifeDentalCheck = () => {
    // TODO: Implement Metlife Dental eligibility check
    console.log("Checking Metlife Dental eligibility:", { memberId, dateOfBirth, firstName, lastName });
  };

  const handlePatientSelect = (patientId: number) => {
    const patient = patients.find(p => p.id === patientId);
    if (patient) {
      setSelectedPatientId(patientId);
      // Auto-fill form fields with selected patient data
      setMemberId(patient.insuranceId || "");
      setDateOfBirth(patient.dateOfBirth || "");
      setFirstName(patient.firstName || "");
      setLastName(patient.lastName || "");
    } else {
      setSelectedPatientId(null);
      // Clear form fields
      setMemberId("");
      setDateOfBirth("");
      setFirstName("");
      setLastName("");
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isMobileOpen={isMobileMenuOpen} setIsMobileOpen={setIsMobileMenuOpen} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopAppBar toggleMobileMenu={toggleMobileMenu} />
        
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">Insurance Eligibility</h1>
              <p className="text-gray-600">Check insurance eligibility and view patient information</p>
            </div>

            {/* Insurance Eligibility Check Form */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Check Insurance Eligibility</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
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
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Button 
                        onClick={() => handleProviderClick('MH')}
                        className="w-full"
                        disabled={checkInsuranceMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {checkInsuranceMutation.isPending && selectedProvider === 'MH' ? 'Checking...' : 'MH'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Search and Filters */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search patients..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Select value={searchField} onValueChange={setSearchField}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Fields</SelectItem>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="id">Patient ID</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Advanced
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Patient List */}
            <Card>
              <CardContent className="p-0">
                {isLoadingPatients ? (
                  <div className="text-center py-8">Loading patients...</div>
                ) : (
                  <>
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b text-sm font-medium text-gray-600">
                      <div className="col-span-1">Select</div>
                      <div className="col-span-3">Patient</div>
                      <div className="col-span-2">DOB / Gender</div>
                      <div className="col-span-2">Contact</div>
                      <div className="col-span-2">Insurance</div>
                      <div className="col-span-1">Status</div>
                      <div className="col-span-1">Actions</div>
                    </div>

                    {/* Table Rows */}
                    {currentPatients.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        {searchTerm ? "No patients found matching your search." : "No patients available."}
                      </div>
                    ) : (
                      currentPatients.map((patient) => (
                        <div 
                          key={patient.id} 
                          className={cn(
                            "grid grid-cols-12 gap-4 p-4 border-b hover:bg-gray-50 transition-colors",
                            selectedPatientId === patient.id && "bg-blue-50 border-blue-200"
                          )}
                        >
                          {/* Select Checkbox */}
                          <div className="col-span-1 flex items-center">
                            <Checkbox
                              checked={selectedPatientId === patient.id}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  handlePatientSelect(patient.id);
                                } else {
                                  handlePatientSelect(0); // This will clear the selection
                                }
                              }}
                            />
                          </div>

                          {/* Patient Info */}
                          <div className="col-span-3 flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                              {getPatientInitials(patient.firstName, patient.lastName)}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {patient.firstName} {patient.lastName}
                              </div>
                              <div className="text-sm text-gray-500">
                                PID-{patient.id.toString().padStart(4, '0')}
                              </div>
                            </div>
                          </div>

                          {/* DOB / Gender */}
                          <div className="col-span-2">
                            <div className="text-sm text-gray-900">
                              {formatDate(patient.dateOfBirth)}
                            </div>
                            <div className="text-sm text-gray-500 capitalize">
                              {patient.gender}
                            </div>
                          </div>

                          {/* Contact */}
                          <div className="col-span-2">
                            <div className="text-sm text-gray-900">
                              {patient.phone || 'Not provided'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {patient.email || 'No email'}
                            </div>
                          </div>

                          {/* Insurance */}
                          <div className="col-span-2">
                            <div className="text-sm text-gray-900">
                              {patient.insuranceProvider ? 
                                `${patient.insuranceProvider.charAt(0).toUpperCase()}${patient.insuranceProvider.slice(1)}` : 
                                'Not specified'
                              }
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {patient.insuranceId || 'N/A'}
                            </div>
                          </div>

                          {/* Status */}
                          <div className="col-span-1">
                            <span className={cn(
                              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                              patient.status === 'active' 
                                ? "bg-green-100 text-green-800" 
                                : "bg-gray-100 text-gray-800"
                            )}>
                              {patient.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="col-span-1">
                            <div className="flex space-x-1">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Edit className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Eye className="h-4 w-4 text-gray-600" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between p-4 border-t bg-gray-50">
                        <div className="text-sm text-gray-700">
                          Showing {startIndex + 1} to {Math.min(endIndex, filteredPatients.length)} of {filteredPatients.length} results
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Previous
                          </Button>
                          
                          {/* Page Numbers */}
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="w-8 h-8 p-0"
                            >
                              {page}
                            </Button>
                          ))}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                          >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
      
      {/* Credentials Modal */}
      <CredentialsModal
        isOpen={isCredentialsModalOpen}
        onClose={() => setIsCredentialsModalOpen(false)}
        onSubmit={handleCredentialsSubmit}
        providerName={selectedProvider}
        isLoading={checkInsuranceMutation.isPending}
      />
    </div>
  );
}