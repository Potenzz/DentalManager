import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { CheckCircle, LoaderCircleIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { PatientTable } from "@/components/patients/patient-table";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  setTaskStatus,
  clearTaskStatus,
} from "@/redux/slices/seleniumEligibilityCheckTaskSlice";
import { SeleniumTaskBanner } from "@/components/ui/selenium-task-banner";
import { formatLocalDate, parseLocalDate } from "@/utils/dateUtils";
import { InsertPatient, Patient } from "@repo/db/types";
import { DateInput } from "@/components/ui/dateInput";
import { QK_PATIENTS_BASE } from "@/components/patients/patient-table";

export default function InsuranceEligibilityPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const { status, message, show } = useAppSelector(
    (state) => state.seleniumEligibilityCheckTask
  );
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [currentTablePage, setCurrentTablePage] = useState<number | null>(null);
  const [currentTableSearchTerm, setCurrentTableSearchTerm] = useState<
    string | null
  >(null);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Insurance eligibility check form fields
  const [memberId, setMemberId] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);

  // Populate fields from selected patient
  useEffect(() => {
    if (selectedPatient) {
      setMemberId(selectedPatient.insuranceId ?? "");
      setFirstName(selectedPatient.firstName ?? "");
      setLastName(selectedPatient.lastName ?? "");

      const dob =
        typeof selectedPatient.dateOfBirth === "string"
          ? parseLocalDate(selectedPatient.dateOfBirth)
          : selectedPatient.dateOfBirth;
      setDateOfBirth(dob);
    } else {
      setMemberId("");
      setFirstName("");
      setLastName("");
      setDateOfBirth(null);
    }
  }, [selectedPatient]);

  // Add patient mutation
  const addPatientMutation = useMutation({
    mutationFn: async (patient: InsertPatient) => {
      const res = await apiRequest("POST", "/api/patients/", patient);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK_PATIENTS_BASE });
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
          variant: "destructive",
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

  // handle selenium
  const handleSelenium = async () => {
    const formattedDob = dateOfBirth ? formatLocalDate(dateOfBirth) : "";

    const data = {
      memberId,
      dateOfBirth: formattedDob,
      insuranceSiteKey: "MH",
    };
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
          message:
            "Patient status is updated, and its eligibility pdf is uploaded at Document Page.",
        })
      );

      toast({
        title: "Selenium service done.",
        description:
          "Your Patient Eligibility is fetched and updated, Kindly search through the patient.",
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

  const handleAddPatient = async () => {
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
    await addPatientMutation.mutateAsync(newPatient);
  };

  // Handle insurance provider button clicks
  const handleMHButton = async () => {
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

    setIsCheckingEligibility(true);

    // Adding patient if same patient exists then it will skip.
    try {
      if (!selectedPatient) {
        await handleAddPatient();
      }

      await handleSelenium();

      await queryClient.invalidateQueries({
        queryKey: [
          "patients",
          {
            page: currentTablePage ?? 1,
            search: currentTableSearchTerm ?? "recent",
          },
        ],
      });
    } finally {
      setIsCheckingEligibility(false);
    }
  };

  return (
    <div>
      <SeleniumTaskBanner
        status={status}
        message={message}
        show={show}
        onClear={() => dispatch(clearTaskStatus())}
      />

      <div className="container mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Insurance Eligibility
            </h1>
            <p className="text-muted-foreground">
              Check insurance eligibility and view patient information
            </p>
          </div>
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
                <DateInput
                  label="Date of Birth"
                  value={dateOfBirth}
                  onChange={setDateOfBirth}
                  disableFuture
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
                onClick={() => handleMHButton()}
                className="w-full"
                disabled={isCheckingEligibility}
              >
                {isCheckingEligibility ? (
                  <>
                    <LoaderCircleIcon className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    MH
                  </>
                )}
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
              onPageChange={setCurrentTablePage}
              onSearchChange={setCurrentTableSearchTerm}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
