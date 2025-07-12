import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { TopAppBar } from "@/components/layout/top-app-bar";
import { Sidebar } from "@/components/layout/sidebar";
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
import { CheckCircle } from "lucide-react";
import { PatientUncheckedCreateInputObjectSchema } from "@repo/db/usedSchemas";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { PatientTable } from "@/components/patients/patient-table";

const PatientSchema = (
  PatientUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
).omit({
  appointments: true,
});
type Patient = z.infer<typeof PatientSchema>;

export default function InsuranceEligibilityPage() {
  const { user } = useAuth();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Insurance eligibility check form fields
  const [memberId, setMemberId] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Selected patient for insurance check
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(
    null
  );

  // Insurance automation states
  const [selectedProvider, setSelectedProvider] = useState("");
  const { toast } = useToast();

  // Insurance eligibility check mutation
  const checkInsuranceMutation = useMutation({
    mutationFn: async ({
      provider,
      patientId,
      credentials,
    }: {
      provider: string;
      patientId: number;
      credentials: { username: string; password: string };
    }) => {
      const response = await fetch("/api/insurance/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ provider, patientId, credentials }),
      });

      if (!response.ok) {
        throw new Error("Failed to check insurance");
      }

      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Insurance Check Complete",
        description: result.isEligible
          ? `Patient is eligible. Plan: ${result.planName}`
          : "Patient eligibility could not be verified",
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

  // Handle insurance provider button clicks
  const handleProviderClick = (providerName: string) => {
    if (!selectedPatientId) {
      toast({
        title: "No Patient Selected",
        description:
          "Please select a patient first by checking the box next to their name.",
        variant: "destructive",
      });
      return;
    }

    setSelectedProvider(providerName);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopAppBar toggleMobileMenu={toggleMobileMenu} />

        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                Insurance Eligibility
              </h1>
              <p className="text-gray-600">
                Check insurance eligibility and view patient information
              </p>
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
                <div>
                  <Button
                    onClick={() => handleProviderClick("MH")}
                    className="w-full"
                    disabled={checkInsuranceMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {checkInsuranceMutation.isPending &&
                    selectedProvider === "MH"
                      ? "Checking..."
                      : "MH"}
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
        </main>
      </div>
    </div>
  );
}
