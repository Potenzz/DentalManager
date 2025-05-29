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
import { PatientUncheckedCreateInputObjectSchema, AppointmentUncheckedCreateInputObjectSchema} from "@repo/db/usedSchemas";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { MultipleFileUploadZone } from "../file-upload/multiple-file-upload-zone";

const PatientSchema = (
  PatientUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
).omit({
  appointments: true,
});
type Patient = z.infer<typeof PatientSchema>;


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
    userId: true,
  })
  .partial();
type UpdateAppointment = z.infer<typeof updateAppointmentSchema>;


interface ServiceLine {
  procedure_code: string;
  procedure_date: string;
  oralCavityArea: string;
  toothNumber: string;
  toothSurface: string;
  billedAmount: string;
}

interface ClaimFormProps {
  patientId?: number;
  extractedData?: Partial<Patient>;
  onSubmit: (claimData: any) => void;
  onHandleAppointmentSubmit: (appointmentData: InsertAppointment | UpdateAppointment) => void;  
  onClose: () => void;
}

interface Staff {
  id: string;
  name: string;
  role: "doctor" | "hygienist";
  color: string;
}

export function ClaimForm({
  patientId,
  extractedData,
  onHandleAppointmentSubmit,
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

  //Fetching staff memebers
  const [staff, setStaff] = useState<Staff | null>(null);
  const { data: staffMembersRaw = [] as Staff[], isLoading: isLoadingStaff } =
    useQuery<Staff[]>({
      queryKey: ["/api/staffs/"],
      queryFn: async () => {
        const res = await apiRequest("GET", "/api/staffs/");
        return res.json();
      },
    });

  // Service date state
  const [serviceDateValue, setServiceDateValue] = useState<Date>(new Date());
  const [serviceDate, setServiceDate] = useState<string>(
    format(new Date(), "MM/dd/yyyy")
  );

  const formatServiceDate = (date: Date | undefined): string => {
    return date ? format(date, "MM/dd/yyyy") : "";
  };

  useEffect(() => {
    if (extractedData?.serviceDate) {
      const parsed = new Date(extractedData.serviceDate);
      setServiceDateValue(parsed);
      setServiceDate(formatServiceDate(parsed));
    }
  }, [extractedData]);

  // used in submit button to send correct date.
  function convertToISODate(mmddyyyy: string): string {
  const [month, day, year] = mmddyyyy.split("/");
  return `${year}-${month?.padStart(2, "0")}-${day?.padStart(2, "0")}`;
}


  // Remarks state
  const [remarks, setRemarks] = useState<string>("");

  // Service lines state with one empty default line
  const [serviceLines, setServiceLines] = useState<ServiceLine[]>([]);
  useEffect(() => {
    if (serviceDate) {
      setServiceLines([
        {
          procedure_code: "",
          procedure_date: serviceDate,
          oralCavityArea: "",
          toothNumber: "",
          toothSurface: "",
          billedAmount: "",
        },
      ]);
    }
  }, [serviceDate]);

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

  const updateProcedureDate = (index: number, date: Date | undefined) => {
    const formatted = formatServiceDate(date);
    updateServiceLine(index, "procedure_date", formatted);
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

  // FILE UPLOAD ZONE
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = (files: File[]) => {
    setIsUploading(true);

    const validFiles = files.filter((file) => file.type === "application/pdf");
    if (validFiles.length > 10) {
      toast({
        title: "Too Many Files",
        description: "You can only upload up to 10 PDFs.",
        variant: "destructive",
      });
      setIsUploading(false);
      return;
    }

    setUploadedFiles(validFiles);

    toast({
      title: "Files Selected",
      description: `${validFiles.length} PDF file(s) ready for processing.`,
    });

    setIsUploading(false);
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
              <Label htmlFor="remarks" className="whitespace-nowrap">
                Remarks:
              </Label>
              <Input
                id="remarks"
                className="flex-grow"
                placeholder="Paste clinical notes here"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>

            {/* Service Lines */}
            <div>
              <h3 className="text-xl font-semibold mb-2 text-center">
                Service Lines
              </h3>
              <div className="flex justify-end items-center mb-2">
                {/* Service Date */}
                <div className="flex gap-2">
                  <Label className="flex items-center">Service Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-[140px] justify-start text-left font-normal mr-4"
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
                  {/* Treating doctor */}
                  <Label className="flex items-center ml-2">
                    Treating Doctor
                  </Label>
                  <Select
                    value={staff?.id || ""}
                    onValueChange={(id) => {
                      const selected = staffMembersRaw.find(
                        (member) => member.id === id
                      );
                      if (selected) setStaff(selected);
                    }}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Select Staff" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffMembersRaw.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-6 gap-4 mb-2 font-medium text-sm text-gray-700">
                <span>Procedure Code</span>
                <span>Procedure Date</span>
                <span>Oral Cavity Area</span>
                <span>Tooth Number</span>
                <span>Tooth Surface</span>
                <span>Billed Amount</span>
              </div>

              {/* Dynamic Rows */}
              {serviceLines.map((line, i) => (
                <div key={i} className="grid grid-cols-6 gap-4 mb-2">
                  <Input
                    placeholder="eg. D0120"
                    value={line.procedure_code}
                    onChange={(e) =>
                      updateServiceLine(i, "procedure_code", e.target.value)
                    }
                  />

                  {/* Date Picker */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {line.procedure_date || "Pick Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={new Date(line.procedure_date)}
                        onSelect={(date) => updateProcedureDate(i, date)}
                      />
                    </PopoverContent>
                  </Popover>

                  <Input
                    placeholder="Oral Cavity Area"
                    value={line.oralCavityArea}
                    onChange={(e) =>
                      updateServiceLine(i, "oralCavityArea", e.target.value)
                    }
                  />
                  <Input
                    placeholder="eg. 14"
                    value={line.toothNumber}
                    onChange={(e) =>
                      updateServiceLine(i, "toothNumber", e.target.value)
                    }
                  />
                  <Input
                    placeholder="eg. MOD"
                    value={line.toothSurface}
                    onChange={(e) =>
                      updateServiceLine(i, "toothSurface", e.target.value)
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
                      procedure_code: "",
                      procedure_date: serviceDate,
                      oralCavityArea: "",
                      toothNumber: "",
                      toothSurface: "",
                      billedAmount: "",
                    },
                  ])
                }
              >
                + Add Service Line
              </Button>

              <div className="flex gap-2 mt-10 mb-10">
                <Button variant="outline">Child Prophy Codes</Button>
                <Button variant="outline">Adult Prophy Codes</Button>
                <Button variant="outline">Customized Group Codes</Button>
                <Button variant="outline">Map Price</Button>
              </div>
            </div>

            {/* File Upload Section */}
            <div className="mt-4 bg-gray-100 p-4 rounded-md space-y-4">
              <p className="text-sm text-gray-500">
                Only PDF files allowed. You can upload up to 10 files. File
                types with 4+ character extensions like .DOCX, .PPTX, or .XLSX
                are not allowed.
              </p>

              <div className="flex flex-wrap gap-4 items-center justify-between">
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
              </div>

              <MultipleFileUploadZone
                onFileUpload={handleFileUpload}
                isUploading={isUploading}
                acceptedFileTypes="application/pdf"
                maxFiles={10}
              />

              {uploadedFiles.length > 0 && (
                <ul className="text-sm text-gray-700 list-disc ml-6">
                  {uploadedFiles.map((file, index) => (
                    <li key={index}>{file.name}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Insurance Carriers */}
            <div>
              <h3 className="text-xl font-semibold mb-4 text-center">
                Insurance Carriers
              </h3>
              <div className="flex justify-between">
                <Button
                  className="w-32"
                  variant="outline"
                  onClick={() => {
                     const appointmentData = {
                          patientId: patientId,  
                          date: convertToISODate(serviceDate), 
                          staffId:staff?.id,
                        };

                  // 1. Create or update appointment
                  onHandleAppointmentSubmit(appointmentData);}}
                >
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
