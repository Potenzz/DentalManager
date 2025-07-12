import { useEffect, useState } from "react";
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
import { CalendarIcon, CheckCircle } from "lucide-react";
import { PatientUncheckedCreateInputObjectSchema } from "@repo/db/usedSchemas";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { PatientTable } from "@/components/patients/patient-table";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const PatientSchema = (
  PatientUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
).omit({
  appointments: true,
});
type Patient = z.infer<typeof PatientSchema>;

export default function InsuranceEligibilityPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Insurance eligibility check form fields
  const [memberId, setMemberId] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Populate fields from selected patient
  useEffect(() => {
  if (selectedPatient) {
    setMemberId(selectedPatient.insuranceId ?? "");
    setFirstName(selectedPatient.firstName ?? "");
    setLastName(selectedPatient.lastName ?? "");

    const dob = selectedPatient.dateOfBirth
      ? new Date(selectedPatient.dateOfBirth)
      : undefined;
    setDateOfBirth(dob);
  } else {
    setMemberId("");
    setFirstName("");
    setLastName("");
    setDateOfBirth(undefined);
  }
}, [selectedPatient]);


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
  const handleMHButton= () => {
    if (!memberId || !dateOfBirth || !firstName) {
    toast({
      title: "Missing Fields",
      description:
        "Please fill in all the required fields: Member ID, Date of Birth, First Name.",
      variant: "destructive",
    });
    return;
  }
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
                    <Label htmlFor="dob">Date of Birth</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3  text-left font-normal",
                            !dateOfBirth && "text-muted-foreground"
                          )}
                        >
                          {dateOfBirth ? (
                            format(dateOfBirth, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-4">
                        <Calendar
                          mode="single"
                          selected={dateOfBirth}
                          onSelect={setDateOfBirth}
                          disabled={(date) => date > new Date()}
                        />
                      </PopoverContent>
                    </Popover>
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
                    onClick={() => handleMHButton()}
                    className="w-full"
                    disabled={checkInsuranceMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    MH
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
