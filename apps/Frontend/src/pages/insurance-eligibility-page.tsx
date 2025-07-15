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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  setTaskStatus,
  clearTaskStatus,
} from "@/redux/slices/seleniumEligibilityCheckTaskSlice";
import { SeleniumTaskBanner } from "@/components/claims/selenium-task-banner";
import { formatLocalDate } from "@/utils/dateUtils";

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
  userId: true,
});
type InsertPatient = z.infer<typeof insertPatientSchema>;

export default function InsuranceEligibilityPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const { status, message, show } = useAppSelector(
    (state) => state.seleniumEligibilityCheckTask
  );


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
      setDateOfBirth(dob);
    } else {
      setMemberId("");
      setFirstName("");
      setLastName("");
      setDateOfBirth(undefined);
    }
  }, [selectedPatient]);

  // Add patient mutation
  const addPatientMutation = useMutation({
    mutationFn: async (patient: InsertPatient) => {
      const res = await apiRequest("POST", "/api/patients/", patient);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast({
        title: "Success",
        description: "Patient added successfully!",
        variant: "default",
      });
    },
    onError: (error: any) => {
      const msg = error.message;

      if (msg === "A patient with this insurance ID already exists.") {
        toast({
          title: "Patient already exists",
          description: msg,
          variant: "default", 
        });
      } else {
        toast({
          title: "Error",
          description: `Failed to add patient: ${msg}`,
          variant: "destructive", 
        });
      }
    },
  });

  // Insurance eligibility check mutation --- not using right now
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

  // handle selenium
    const handleSelenium = async () => {

      const formattedDob = dateOfBirth ? formatLocalDate(dateOfBirth) : "";

      const data = {memberId, dateOfBirth: formattedDob, insuranceSiteKey: "MH", };
      try {
        dispatch(
          setTaskStatus({
            status: "pending",
            message: "Sending Data to Selenium...",
          })
        );
        const response = await apiRequest(
          "POST",
          "/api/insuranceEligibility/check",
          { data: JSON.stringify(data) }
        );
        const result = await response.json();
        if (result.error) throw new Error(result.error);
  
        dispatch(
          setTaskStatus({
            status: "success",
            message: "Submitted to Selenium.",
          })
        );
  
        toast({
          title: "Selenium service notified",
          description:
            "Your claim data was successfully sent to Selenium, Waitinig for its response.",
          variant: "default",
        });
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


  const handleAddPatient = () => {
    const newPatient: InsertPatient = {
      firstName,
      lastName,
      dateOfBirth: dateOfBirth,
      gender: "",
      phone: "",
      userId: user?.id ?? 1,
      status: "active",
      insuranceId: memberId,
    };
    addPatientMutation.mutate(newPatient);
  }

  // Handle insurance provider button clicks
  const handleMHButton = () => {
    // Form Fields check
    if (!memberId || !dateOfBirth || !firstName) {
      toast({
        title: "Missing Fields",
        description:
          "Please fill in all the required fields: Member ID, Date of Birth, First Name.",
        variant: "destructive",
      });
      return;
    }

    // Adding patient if same patient exists then it will skip.
    handleAddPatient();

    handleSelenium();


  };

  return (
    <div className="flex h-screen bg-gray-50">
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
