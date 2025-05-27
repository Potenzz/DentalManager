import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, parse } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { X, Calendar as CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PatientUncheckedCreateInputObjectSchema } from "@repo/db/usedSchemas";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const PatientSchema = (
  PatientUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
).omit({
  appointments: true,
});
type Patient = z.infer<typeof PatientSchema>;

interface ServiceLine {
  procedureCode: string;
  toothNumber: string;
  surface: string;
  quad: string;
  authNo: string;
  billedAmount: string;
}

interface ClaimFormProps {
  patientId?: number;
  extractedData?: Partial<Patient>;
  onSubmit: (claimData: any) => void;
  onClose: () => void;
}

export function ClaimForm({
  patientId,
  extractedData,
  onSubmit,
  onClose,
}: ClaimFormProps) {
  const { toast } = useToast();

  // Query patient if patientId provided
  const {
    data: fetchedPatient,
    isLoading,
    error,
  } = useQuery<Patient>({
    queryKey: ["/api/patients/", patientId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/patients/${patientId}`);
      if (!res.ok) throw new Error("Failed to fetch patient");
      return res.json();
    },
    enabled: !!patientId,
  });

  // Patient state - initialize from extractedData or null (new patient)
  const [patient, setPatient] = useState<Patient | null>(
    extractedData ? ({ ...extractedData } as Patient) : null
  );

  // Sync fetched patient when available
  useEffect(() => {
    if (fetchedPatient) {
      setPatient(fetchedPatient);
    }
  }, [fetchedPatient]);

  // Service date state
  const [serviceDateValue, setServiceDateValue] = useState<Date>(new Date());
  const [serviceDate, setServiceDate] = useState<string>(
    format(new Date(), "MM/dd/yy")
  );

useEffect(() => {
  console.log("🚨 extractedData in effect:", extractedData);
  if (extractedData?.serviceDate) {
    const parsed = new Date(extractedData.serviceDate);
    console.log("✅ Parsed serviceDate from extractedData:", parsed);
    setServiceDateValue(parsed);
    setServiceDate(format(parsed, "MM/dd/yy"));
  }
}, [extractedData]);


  // Clinical notes state
  const [clinicalNotes, setClinicalNotes] = useState<string>("");

  // Doctor selection state
  const [doctor, setDoctor] = useState("doctor1");

  // Service lines state with one empty default line
  const [serviceLines, setServiceLines] = useState<ServiceLine[]>([
    {
      procedureCode: "",
      toothNumber: "",
      surface: "",
      quad: "",
      authNo: "",
      billedAmount: "",
    },
  ]);

  // Update a field in serviceLines at index
  const updateServiceLine = (
    index: number,
    field: keyof ServiceLine,
    value: string
  ) => {
    setServiceLines((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index][field] = value;
      }
      return updated;
    });
  };

  // Handle patient field changes (to make inputs controlled and editable)
  const updatePatientField = (field: keyof Patient, value: any) => {
    setPatient((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  // Update service date when calendar date changes
  const onServiceDateChange = (date: Date | undefined) => {
    if (date) {
      setServiceDateValue(date);
      setServiceDate(format(date, "MM/dd/yy"));
    }
  };

  // Determine patient date of birth format
  const formatDOB = (dob: string | undefined) => {
    if (!dob) return "";

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) return dob; // already MM/DD/YYYY

    if (/^\d{4}-\d{2}-\d{2}/.test(dob)) {
      const datePart = dob?.split("T")[0]; // safe optional chaining
      if (!datePart) return "";
      const [year, month, day] = datePart.split("-");
      return `${month}/${day}/${year}`;
    }

    return dob;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white">
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
          <CardTitle className="text-xl font-bold">
            Insurance Claim Form
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-6">
            {/* Patient Information */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label htmlFor="memberId">Member ID</Label>
                <Input
                  id="memberId"
                  value={patient?.insuranceId || ""}
                  onChange={(e) =>
                    updatePatientField("insuranceId", e.target.value)
                  }
                  disabled={isLoading}
                />
              </div>
              <div>
                <Label htmlFor="dateOfBirth">Date Of Birth</Label>
                <Input
                  id="dateOfBirth"
                  value={formatDOB(patient?.dateOfBirth)}
                  onChange={(e) =>
                    updatePatientField("dateOfBirth", e.target.value)
                  }
                  disabled={isLoading}
                />
              </div>
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={patient?.firstName || ""}
                  onChange={(e) =>
                    updatePatientField("firstName", e.target.value)
                  }
                  disabled={isLoading}
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={patient?.lastName || ""}
                  onChange={(e) =>
                    updatePatientField("lastName", e.target.value)
                  }
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Clinical Notes Entry */}
            <div className="mb-4 flex items-center gap-2">
              <Label htmlFor="clinicalNotes" className="whitespace-nowrap">
                Clinical Notes:
              </Label>
              <Input
                id="clinicalNotes"
                className="flex-grow"
                placeholder="Paste clinical notes here"
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (clinicalNotes.trim()) {
                    toast({
                      title: "Field Extraction",
                      description: "Clinical notes have been processed",
                    });
                    // Here you would add actual parsing logic to extract values
                    // from the clinicalNotes and update form fields
                  } else {
                    toast({
                      title: "Empty Input",
                      description: "Please enter clinical notes to extract",
                      variant: "destructive",
                    });
                  }
                }}
              >
                Extract Fields
              </Button>
            </div>

            {/* Service Lines */}
            <div>
              <h3 className="text-xl font-semibold mb-2 text-center">
                Service Lines
              </h3>
              <div className="flex justify-end items-center mb-2">
                <div className="flex gap-2">
                  <Label className="flex items-center">Service Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-[120px] justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {serviceDate}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={serviceDateValue}
                        onSelect={onServiceDateChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Label className="flex items-center ml-2">
                    Treating Doctor
                  </Label>
                  <Select value={doctor} onValueChange={setDoctor}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Select Doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="doctor1">Kai Gao</SelectItem>
                      <SelectItem value="doctor2">Jane Smith</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-6 gap-4 mb-2 font-medium text-sm text-gray-700">
                <span>Procedure Code</span>
                <span>Tooth Number</span>
                <span>Surface</span>
                <span>Quadrant</span>
                <span>Auth No.</span>
                <span>Billed Amount</span>
              </div>

              {/* Dynamic Rows */}
              {serviceLines.map((line, i) => (
                <div key={i} className="grid grid-cols-6 gap-4 mb-2">
                  <Input
                    placeholder="e.g. D0120"
                    value={line.procedureCode}
                    onChange={(e) =>
                      updateServiceLine(i, "procedureCode", e.target.value)
                    }
                  />
                  <Input
                    placeholder="e.g. 14"
                    value={line.toothNumber}
                    onChange={(e) =>
                      updateServiceLine(i, "toothNumber", e.target.value)
                    }
                  />
                  <Input
                    placeholder="e.g. MOD"
                    value={line.surface}
                    onChange={(e) =>
                      updateServiceLine(i, "surface", e.target.value)
                    }
                  />
                  <Select
                    value={line.quad}
                    onValueChange={(value) =>
                      updateServiceLine(i, "quad", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UR">Upper Right</SelectItem>
                      <SelectItem value="UL">Upper Left</SelectItem>
                      <SelectItem value="LR">Lower Right</SelectItem>
                      <SelectItem value="LL">Lower Left</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="e.g. 123456"
                    value={line.authNo}
                    onChange={(e) =>
                      updateServiceLine(i, "authNo", e.target.value)
                    }
                  />
                  <Input
                    placeholder="$0.00"
                    value={line.billedAmount}
                    onChange={(e) =>
                      updateServiceLine(i, "billedAmount", e.target.value)
                    }
                  />
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() =>
                  setServiceLines([
                    ...serviceLines,
                    {
                      procedureCode: "",
                      toothNumber: "",
                      surface: "",
                      quad: "",
                      authNo: "",
                      billedAmount: "",
                    },
                  ])
                }
              >
                + Add Service Line
              </Button>

              <div className="flex gap-2 mt-4">
                <Button variant="outline">Child Prophy Codes</Button>
                <Button variant="outline">Adult Prophy Codes</Button>
                <Button variant="outline">Customized Group Codes</Button>
                <Button variant="outline">Map Price</Button>
              </div>

              {/* File Upload Section */}
              <div className="mt-4 bg-gray-100 p-3 rounded-md">
                <p className="text-sm text-gray-500 mb-2">
                  Please note that file types with 4 or more character
                  extensions are not allowed, such as .DOCX, .PPTX, or .XLSX
                </p>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Label>Select Field:</Label>
                    <Select defaultValue="supportData">
                      <SelectTrigger className="w-60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="supportData">
                          Support Data for Claim
                        </SelectItem>
                        <SelectItem value="xrays">X-Ray Images</SelectItem>
                        <SelectItem value="photos">Clinical Photos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button>Upload Document</Button>
                </div>
              </div>
            </div>

            {/* Insurance Carriers */}
            <div>
              <h3 className="text-xl font-semibold mb-4 text-center">
                Insurance Carriers
              </h3>
              <div className="flex justify-between">
                <Button className="w-32" variant="outline">
                  Delta MA
                </Button>
                <Button className="w-32" variant="outline">
                  MH
                </Button>
                <Button className="w-32" variant="outline">
                  Others
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
