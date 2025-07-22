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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { X, Calendar as CalendarIcon, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  PatientUncheckedCreateInputObjectSchema,
  AppointmentUncheckedCreateInputObjectSchema,
  ClaimUncheckedCreateInputObjectSchema,
} from "@repo/db/usedSchemas";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { MultipleFileUploadZone } from "../file-upload/multiple-file-upload-zone";
import { useAuth } from "@/hooks/use-auth";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import procedureCodes from "../../assets/data/procedureCodes.json";
import { formatLocalDate, parseLocalDate } from "@/utils/dateUtils";

const PatientSchema = (
  PatientUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
).omit({
  appointments: true,
});
type Patient = z.infer<typeof PatientSchema>;

const updatePatientSchema = (
  PatientUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
)
  .omit({
    id: true,
    createdAt: true,
    userId: true,
  })
  .partial();

type UpdatePatient = z.infer<typeof updatePatientSchema>;

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

type Claim = z.infer<typeof ClaimUncheckedCreateInputObjectSchema>;

interface ServiceLine {
  procedureCode: string;
  procedureDate: string; // YYYY-MM-DD
  oralCavityArea?: string;
  toothNumber?: string;
  toothSurface?: string;
  billedAmount: number;
}

interface ClaimFormData {
  patientId: number;
  appointmentId: number;
  userId: number;
  staffId: number;
  patientName: string;
  memberId: string;
  dateOfBirth: string;
  remarks: string;
  serviceDate: string; // YYYY-MM-DD
  insuranceProvider: string;
  insuranceSiteKey?: string;
  status: string; // default "pending"
  serviceLines: ServiceLine[];
  claimId?: number;
}

interface ClaimFormProps {
  patientId: number;
  extractedData?: Partial<Patient>;
  onSubmit: (data: ClaimFormData) => Promise<Claim>;
  onHandleAppointmentSubmit: (
    appointmentData: InsertAppointment | UpdateAppointment
  ) => void;
  onHandleUpdatePatient: (patient: UpdatePatient & { id: number }) => void;
  onHandleForSelenium: (data: ClaimFormData) => void;
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
  onHandleUpdatePatient,
  onHandleForSelenium,
  onSubmit,
  onClose,
}: ClaimFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  // Patient state - initialize from extractedData or null (new patient)
  const [patient, setPatient] = useState<Patient | null>(
    extractedData ? ({ ...extractedData } as Patient) : null
  );

  // Query patient
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
  useEffect(() => {
    if (staffMembersRaw.length > 0 && !staff) {
      const kaiGao = staffMembersRaw.find(
        (member) => member.name === "Kai Gao"
      );
      const defaultStaff = kaiGao || staffMembersRaw[0];
      if (defaultStaff) setStaff(defaultStaff);
    }
  }, [staffMembersRaw, staff]);

  // Service date state
  const [serviceDateValue, setServiceDateValue] = useState<Date>(new Date());
  const [serviceDate, setServiceDate] = useState<string>(
    formatLocalDate(new Date())
  );

  useEffect(() => {
    if (extractedData?.serviceDate) {
      const parsed = parseLocalDate(extractedData.serviceDate);
      const isoFormatted = formatLocalDate(parsed);
      setServiceDateValue(parsed);
      setServiceDate(isoFormatted);
    }
  }, [extractedData]);

  // Update service date when calendar date changes
  const onServiceDateChange = (date: Date | undefined) => {
    if (date) {
      const formattedDate = formatLocalDate(date);
      setServiceDateValue(date);
      setServiceDate(formattedDate);
      setForm((prev) => ({ ...prev, serviceDate: formattedDate }));
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

  // MAIN FORM INITIAL STATE
  const [form, setForm] = useState<ClaimFormData & { uploadedFiles: File[] }>({
    patientId: patientId || 0,
    appointmentId: 0,
    userId: Number(user?.id),
    staffId: Number(staff?.id),
    patientName: `${patient?.firstName} ${patient?.lastName}`.trim(),
    memberId: patient?.insuranceId,
    dateOfBirth: formatDOB(patient?.dateOfBirth),
    remarks: "",
    serviceDate: serviceDate,
    insuranceProvider: "",
    insuranceSiteKey: "",
    status: "PENDING",
    serviceLines: Array.from({ length: 10 }, () => ({
      procedureCode: "",
      procedureDate: serviceDate,
      oralCavityArea: "",
      toothNumber: "",
      toothSurface: "",
      billedAmount: 0,
    })),
    uploadedFiles: [],
  });

  // Sync patient data to form when patient updates
  useEffect(() => {
    if (patient) {
      const fullName =
        `${patient.firstName || ""} ${patient.lastName || ""}`.trim();
      setForm((prev) => ({
        ...prev,
        patientName: fullName,
        dateOfBirth: formatDOB(patient.dateOfBirth),
        memberId: patient.insuranceId || "",
        patientId: patient.id,
      }));
    }
  }, [patient]);

  useEffect(() => {
    setForm((prevForm) => {
      const updatedLines = prevForm.serviceLines.map((line) => ({
        ...line,
        procedureDate: serviceDate, // set all to current serviceDate string
      }));
      return {
        ...prevForm,
        serviceLines: updatedLines,
        serviceDate, // keep form.serviceDate in sync as well
      };
    });
  }, [serviceDate]);

  // Handle patient field changes (to make inputs controlled and editable)
  const updatePatientField = (field: keyof Patient, value: any) => {
    setPatient((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const updateServiceLine = (
    index: number,
    field: keyof ServiceLine,
    value: any
  ) => {
    const updatedLines = [...form.serviceLines];

    if (updatedLines[index]) {
      if (field === "billedAmount") {
        const num = typeof value === "string" ? parseFloat(value) : value;
        const rounded = Math.round((isNaN(num) ? 0 : num) * 100) / 100;
        updatedLines[index][field] = rounded;
      } else {
        updatedLines[index][field] = value;
      }
    }

    setForm({ ...form, serviceLines: updatedLines });
  };

  const updateProcedureDate = (index: number, date: Date | undefined) => {
    if (!date) return;
    const formattedDate = formatLocalDate(date);
    const updatedLines = [...form.serviceLines];

    if (updatedLines[index]) {
      updatedLines[index].procedureDate = formattedDate;
    }

    setForm({ ...form, serviceLines: updatedLines });
  };

  // FILE UPLOAD ZONE
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = (files: File[]) => {
    setIsUploading(true);

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    const validFiles = files.filter((file) => allowedTypes.includes(file.type));

    if (validFiles.length > 10) {
      toast({
        title: "Too Many Files",
        description: "You can only upload up to 10 files (PDFs or images).",
        variant: "destructive",
      });
      setIsUploading(false);
      return;
    }

    if (validFiles.length === 0) {
      toast({
        title: "Invalid File Type",
        description: "Only PDF and image files are allowed.",
        variant: "destructive",
      });
      setIsUploading(false);
      return;
    }

    setForm((prev) => ({
      ...prev,
      uploadedFiles: validFiles,
    }));

    toast({
      title: "Files Selected",
      description: `${validFiles.length} file(s) ready for processing.`,
    });

    setIsUploading(false);
  };

  // Mass Health Button Handler
  const handleMHSubmit = async () => {
    const appointmentData = {
      patientId: patientId,
      date: serviceDate,
      staffId: staff?.id,
    };

    // 1. Create or update appointment
    const appointmentId = await onHandleAppointmentSubmit(appointmentData);

    // 2. Update patient
    if (patient && typeof patient.id === "number") {
      const { id, createdAt, userId, ...sanitizedFields } = patient;
      const updatedPatientFields = {
        id,
        ...sanitizedFields,
        insuranceProvider: "MassHealth",
      };
      onHandleUpdatePatient(updatedPatientFields);
    } else {
      toast({
        title: "Error",
        description: "Cannot update patient: Missing or invalid patient data",
        variant: "destructive",
      });
    }

    // 3. Create Claim(if not)
    // Filter out empty service lines (empty procedureCode)
    const filteredServiceLines = form.serviceLines.filter(
      (line) => line.procedureCode.trim() !== ""
    );

    const { uploadedFiles, insuranceSiteKey, ...formToCreateClaim } = form;
    const createdClaim = await onSubmit({
      ...formToCreateClaim,
      serviceLines: filteredServiceLines,
      staffId: Number(staff?.id),
      patientId: patientId,
      insuranceProvider: "MassHealth",
      appointmentId: appointmentId!,
    });

    // 4. sending form data to selenium service
    onHandleForSelenium({
      ...form,
      serviceLines: filteredServiceLines,
      staffId: Number(staff?.id),
      patientId: patientId,
      insuranceProvider: "Mass Health",
      appointmentId: appointmentId!,
      insuranceSiteKey: "MH",
      claimId: createdClaim.id,
    });
    // 4. Close form
    onClose();
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
                  value={form.memberId}
                  onChange={(e) =>
                    setForm({ ...form, memberId: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="dateOfBirth">Date Of Birth</Label>
                <Input
                  id="dateOfBirth"
                  value={form.dateOfBirth}
                  onChange={(e) => {
                    updatePatientField("dateOfBirth", e.target.value);
                    setForm((prev) => ({
                      ...prev,
                      dateOfBirth: e.target.value,
                    }));
                  }}
                  disabled={isLoading}
                />
              </div>
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={patient?.firstName || ""}
                  onChange={(e) => {
                    updatePatientField("firstName", e.target.value);
                    setForm((prev) => ({
                      ...prev,
                      patientName:
                        `${e.target.value} ${patient?.lastName || ""}`.trim(),
                    }));
                  }}
                  disabled={isLoading}
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={patient?.lastName || ""}
                  onChange={(e) => {
                    updatePatientField("lastName", e.target.value);
                    setForm((prev) => ({
                      ...prev,
                      patientName:
                        `${patient?.firstName || ""} ${e.target.value}`.trim(),
                    }));
                  }}
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
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
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
                        {form.serviceDate}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={serviceDateValue}
                        onSelect={onServiceDateChange}
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
                      if (selected) {
                        setStaff(selected);
                        setForm((prev) => ({
                          ...prev,
                          staffId: Number(selected.id),
                        }));
                      }
                    }}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue
                        placeholder={staff ? staff.name : "Select Staff"}
                      />
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

              <div className="grid grid-cols-7 gap-4 mb-2 font-medium text-sm text-gray-700">
                <span>Procedure Code</span>
                <span>Abbreviation</span>
                <span>Procedure Date</span>
                <span>Oral Cavity Area</span>
                <span>Tooth Number</span>
                <span>Tooth Surface</span>
                <span>Billed Amount</span>
              </div>

              {/* Dynamic Rows */}
              {form.serviceLines.map((line, i) => (
                <div key={i} className="grid grid-cols-7 gap-1 mb-2">
                  <Input
                    placeholder="eg. D0120"
                    value={line.procedureCode}
                    onChange={(e) =>
                      updateServiceLine(i, "procedureCode", e.target.value)
                    }
                  />

                  <div className="flex items-center justify-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-sm">
                          {line.procedureCode &&
                          line.procedureCode.trim() !== ""
                            ? (() => {
                                const normalizedCode = line.procedureCode
                                  .toUpperCase()
                                  .trim();
                                const procedureInfo = procedureCodes.find(
                                  (p) =>
                                    p["Procedure Code"].toUpperCase().trim() ===
                                    normalizedCode
                                );
                                return procedureInfo
                                  ? procedureInfo.Description ||
                                      "No description available"
                                  : "Enter a valid procedure code";
                              })()
                            : "Enter a procedure code"}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Date Picker */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {line.procedureDate || "Pick Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={new Date(line.procedureDate)}
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
                    placeholder="eg. 'B', 'D', 'F', 'I', 'L', 'M', 'O'"
                    value={line.toothSurface}
                    onChange={(e) =>
                      updateServiceLine(i, "toothSurface", e.target.value)
                    }
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="$0.00"
                    value={line.billedAmount === 0 ? "" : line.billedAmount}
                    onChange={(e) => {
                      updateServiceLine(i, "billedAmount", e.target.value);
                    }}
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value);
                      const rounded = Math.round(val * 100) / 100;
                      updateServiceLine(
                        i,
                        "billedAmount",
                        isNaN(rounded) ? 0 : rounded
                      );
                    }}
                  />
                </div>
              ))}

              <Button
                variant="outline"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    serviceLines: [
                      ...prev.serviceLines,
                      {
                        procedureCode: "",
                        procedureDate: serviceDate,
                        oralCavityArea: "",
                        toothNumber: "",
                        toothSurface: "",
                        billedAmount: 0,
                      },
                    ],
                  }))
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
                You can upload up to 10 files. Allowed types: PDF, JPG, PNG,
                WEBP.
              </p>

              <MultipleFileUploadZone
                onFileUpload={handleFileUpload}
                isUploading={isUploading}
                acceptedFileTypes="application/pdf,image/jpeg,image/jpg,image/png,image/webp"
                maxFiles={10}
              />

              {form.uploadedFiles.length > 0 && (
                <ul className="text-sm text-gray-700 list-disc ml-6">
                  {form.uploadedFiles.map((file, index) => (
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
                  onClick={handleMHSubmit}
                >
                  MH
                </Button>
                <Button className="w-32" variant="outline">
                  Delta MA
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
