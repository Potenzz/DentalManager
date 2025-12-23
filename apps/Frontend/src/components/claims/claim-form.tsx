import { useState, useEffect, useRef, useCallback, memo } from "react";
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
import { X, Calendar as CalendarIcon, HelpCircle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  MultipleFileUploadZone,
  MultipleFileUploadZoneHandle,
} from "../file-upload/multiple-file-upload-zone";
import { useAuth } from "@/hooks/use-auth";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatLocalDate, parseLocalDate } from "@/utils/dateUtils";
import {
  Claim,
  ClaimFileMeta,
  ClaimFormData,
  ClaimPreAuthData,
  InputServiceLine,
  InsertAppointment,
  MissingTeethStatus,
  Patient,
  Staff,
  UpdateAppointment,
  UpdatePatient,
} from "@repo/db/types";
import { Decimal } from "decimal.js";
import {
  mapPricesForForm,
  applyComboToForm,
  getDescriptionForCode,
} from "@/utils/procedureCombosMapping";
import { COMBO_CATEGORIES, PROCEDURE_COMBOS } from "@/utils/procedureCombos";
import { DateInput } from "../ui/dateInput";
import { MissingTeethSimple, type MissingMapStrict } from "./tooth-ui";
import { RemarksField } from "./claims-ui";

interface ClaimFormProps {
  patientId: number;
  appointmentId?: number;
  onSubmit: (data: ClaimFormData) => Promise<Claim>;
  onHandleAppointmentSubmit: (
    appointmentData: InsertAppointment | UpdateAppointment
  ) => Promise<number | { id: number }>;
  onHandleUpdatePatient: (patient: UpdatePatient & { id: number }) => void;
  onHandleForMHSeleniumClaim: (data: ClaimFormData) => void;
  onHandleForMHSeleniumClaimPreAuth: (data: ClaimPreAuthData) => void;
  onClose: () => void;
}

const PERMANENT_TOOTH_NAMES = Array.from(
  { length: 32 },
  (_, i) => `T_${i + 1}`
);
const PRIMARY_TOOTH_NAMES = Array.from("ABCDEFGHIJKLMNOPQRST").map(
  (ch) => `T_${ch}`
);

function isValidToothKey(key: string) {
  return (
    PERMANENT_TOOTH_NAMES.includes(key) || PRIMARY_TOOTH_NAMES.includes(key)
  );
}

export function ClaimForm({
  patientId,
  appointmentId,
  onHandleAppointmentSubmit,
  onHandleUpdatePatient,
  onHandleForMHSeleniumClaim,
  onHandleForMHSeleniumClaimPreAuth,
  onSubmit,
  onClose,
}: ClaimFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const [patient, setPatient] = useState<Patient | null>(null);

  // Query patient based on given patient id
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
  const [serviceDateOpen, setServiceDateOpen] = useState(false);
  const [openProcedureDateIndex, setOpenProcedureDateIndex] = useState<
    number | null
  >(null);

  //incase when appointmentId is given - directly from appoinmentpage - claimpage - to here.
  // then, update the service date as per the appointment date.
  useEffect(() => {
    if (!appointmentId) return;
    if (!Number.isFinite(appointmentId) || appointmentId <= 0) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await apiRequest(
          "GET",
          `/api/appointments/${appointmentId}`
        );
        if (!res.ok) {
          let body: any = null;
          try {
            body = await res.json();
          } catch {}
          if (!cancelled) {
            toast({
              title: "Failed to load appointment",
              description:
                body?.message ??
                body?.error ??
                `Could not fetch appointment ${appointmentId}.`,
              variant: "destructive",
            });
          }
          return;
        }

        const appointment = await res.json();
        // appointment.date is expected to be either "YYYY-MM-DD" or an ISO string.
        const rawDate = appointment?.date ?? appointment?.day ?? "";
        if (!rawDate) return;

        // Use your parseLocalDate to create a local-midnight Date (avoid TZ shifts)
        let dateVal: Date;
        try {
          dateVal = parseLocalDate(String(rawDate));
        } catch (e) {
          // Fallback - try constructing Date and then normalize
          const maybe = new Date(rawDate);
          if (isNaN(maybe.getTime())) {
            console.error("Could not parse appointment date:", rawDate);
            return;
          }
          dateVal = new Date(
            maybe.getFullYear(),
            maybe.getMonth(),
            maybe.getDate()
          );
        }

        if (!cancelled) {
          setServiceDateValue(dateVal);
          setServiceDate(formatLocalDate(dateVal));
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error("Error fetching appointment:", err);
          toast({
            title: "Error",
            description: err?.message ?? "Failed to fetch Appointment.",
            variant: "destructive",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [appointmentId]);

  // Update service date when calendar date changes
  const onServiceDateChange = (date: Date | undefined) => {
    if (date) {
      const formattedDate = formatLocalDate(date);
      setServiceDateValue(date);
      setServiceDate(formattedDate);
      setForm((prev) => ({ ...prev, serviceDate: formattedDate }));
    }
  };

  // when service date is chenged, it will change the each service lines procedure date in sync as well.
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

  // Determine patient date of birth format - required as date extracted from pdfs has different format.
  // Replace previous implementation with this type-safe normalizer.
  // Always returns canonical YYYY-MM-DD or "" if it cannot parse.
  function normalizeToIsoDateString(dob: string | Date | undefined): string {
    if (!dob) return "";

    // Date object -> canonicalize
    if (dob instanceof Date) {
      if (isNaN(dob.getTime())) return "";
      return formatLocalDate(dob);
    }

    const raw = String(dob).trim();
    if (!raw) return "";

    // 1) If already date-only ISO (yyyy-mm-dd)
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      try {
        parseLocalDate(raw); // validate
        return raw;
      } catch {
        return "";
      }
    }

    // 2) Try parseLocalDate for ISO-like inputs (will throw if not suitable)
    try {
      const parsed = parseLocalDate(raw);
      return formatLocalDate(parsed);
    } catch {
      // continue to other fallbacks
    }

    // 3) MM/DD/YYYY or M/D/YYYY -> convert to ISO
    const m1 = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m1) {
      const mm = m1[1] ?? "";
      const dd = m1[2] ?? "";
      const yyyy = m1[3] ?? "";
      if (mm && dd && yyyy) {
        const iso = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
        try {
          parseLocalDate(iso);
          return iso;
        } catch {
          return "";
        }
      }
    }

    // 4) OCR-ish short form: MMDDYY (exactly 6 digits) -> guess century
    const m2 = raw.match(/^(\d{6})$/);
    if (m2) {
      const s = m2[1];
      if (s && s.length === 6) {
        const mm = s.slice(0, 2);
        const dd = s.slice(2, 4);
        const yy = s.slice(4, 6);
        const year = Number(yy) < 50 ? 2000 + Number(yy) : 1900 + Number(yy);
        const iso = `${year}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
        try {
          parseLocalDate(iso);
          return iso;
        } catch {
          return "";
        }
      }
    }

    // 5) Last resort: naive Date parse -> normalize to local calendar fields
    try {
      const maybe = new Date(raw);
      if (!isNaN(maybe.getTime())) {
        return formatLocalDate(maybe);
      }
    } catch {
      /* ignore */
    }

    return "";
  }

  // assumes input is either "" or "YYYY-MM-DD"
  const toMMDDYYYY = (iso: string): string => {
    if (!iso) return "";
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    return m ? `${m[2]}-${m[3]}-${m[1]}` : "";
  };

  // MAIN FORM INITIAL STATE
  const [form, setForm] = useState<ClaimFormData & { uploadedFiles: File[] }>({
    patientId: patientId || 0,
    appointmentId: 0,
    userId: Number(user?.id),
    staffId: Number(staff?.id),
    patientName: `${patient?.firstName} ${patient?.lastName}`.trim(),
    memberId: patient?.insuranceId ?? "",
    dateOfBirth: normalizeToIsoDateString(patient?.dateOfBirth),
    remarks: "",
    missingTeethStatus: "No_missing",
    missingTeeth: {} as MissingMapStrict,
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
      totalBilled: new Decimal(0),
      totalAdjusted: new Decimal(0),
      totalPaid: new Decimal(0),
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
        patientId: Number(patient.id),
        patientName: fullName,
        dateOfBirth: normalizeToIsoDateString(patient.dateOfBirth),
        memberId: patient.insuranceId || "",
      }));
    }
  }, [patient]);

  // Handle patient field changes (to make inputs controlled and editable)
  const updatePatientField = (field: keyof Patient, value: any) => {
    setPatient((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const updateServiceLine = (
    index: number,
    field: keyof InputServiceLine,
    value: any
  ) => {
    const updatedLines = [...form.serviceLines];

    if (updatedLines[index]) {
      if (field === "totalBilled") {
        const num = typeof value === "string" ? parseFloat(value) : value;
        const rounded = Math.round((isNaN(num) ? 0 : num) * 100) / 100;
        updatedLines[index][field] = new Decimal(rounded);
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

  // normalize for display while typing: uppercase and allow letters, commas and spaces
  function normalizeToothSurface(raw?: string): string {
    if (!raw) return "";
    // Uppercase and remove characters that are not A-Z, comma or space
    return raw.toUpperCase().replace(/[^A-Z,\s]/g, "");
  }

  // Missing teeth section
  const setMissingTeethStatus = (status: MissingTeethStatus) => {
    setForm((prev) => {
      if (prev.missingTeethStatus === status) return prev; // no-op
      return {
        ...prev,
        missingTeethStatus: status,
        missingTeeth: status === "Yes_missing" ? prev.missingTeeth : {},
      };
    });
  };

  const updateMissingTooth = useCallback(
    (name: string, value: "" | "X" | "O") => {
      if (!isValidToothKey(name)) return;
      setForm((prev) => {
        const current = prev.missingTeeth[name] ?? "";
        if (current === value) return prev;
        const nextMap = { ...prev.missingTeeth };
        if (!value) delete nextMap[name];
        else nextMap[name] = value;
        return { ...prev, missingTeeth: nextMap };
      });
    },
    []
  );

  const clearAllToothSelections = () =>
    setForm((prev) => ({ ...prev, missingTeeth: {} as MissingMapStrict }));

  // for serviceLine rows, to auto scroll when it got updated by combo buttons and all.
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);

  const scrollToLine = (index: number) => {
    const el = rowRefs.current[index];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Map Price function
  const onMapPrice = () => {
    setForm((prev) =>
      mapPricesForForm({
        form: prev,
        patientDOB: patient?.dateOfBirth ?? "",
      })
    );
  };

  // FILE UPLOAD ZONE
  const uploadZoneRef = useRef<MultipleFileUploadZoneHandle | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // NO validation here — the upload zone handles validation, toasts, max files, sizes, etc.
  const handleFilesChange = useCallback((files: File[]) => {
    setForm((prev) => ({ ...prev, uploadedFiles: files }));
  }, []);

  // 1st Button workflow - Mass Health Button Handler
  const handleMHSubmit = async (
    formToUse?: ClaimFormData & { uploadedFiles?: File[] }
  ) => {
    // Use the passed form, or fallback to current state
    const f = formToUse ?? form;

    // 0. Validate required fields
    const missingFields: string[] = [];

    if (!f.memberId?.trim()) missingFields.push("Member ID");
    if (!f.dateOfBirth?.trim()) missingFields.push("Date of Birth");
    if (!patient?.firstName?.trim()) missingFields.push("First Name");

    if (missingFields.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: `Please fill out the following field(s): ${missingFields.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    // require at least one procedure code before proceeding
    const filteredServiceLines = (f.serviceLines || []).filter(
      (line) => (line.procedureCode ?? "").trim() !== ""
    );
    if (filteredServiceLines.length === 0) {
      toast({
        title: "No procedure codes",
        description:
          "Please add at least one procedure code before submitting the claim.",
        variant: "destructive",
      });
      return;
    }

    // 1. Create or update appointment
    let appointmentIdToUse = appointmentId;

    if (appointmentIdToUse == null) {
      const appointmentData = {
        patientId: patientId,
        date: serviceDate,
        staffId: staff?.id,
      };
      const created = await onHandleAppointmentSubmit(appointmentData);

      if (typeof created === "number" && created > 0) {
        appointmentIdToUse = created;
      } else if (created && typeof (created as any).id === "number") {
        appointmentIdToUse = (created as any).id;
      }
    }

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
    const { uploadedFiles, insuranceSiteKey, ...formToCreateClaim } = f;

    // build claimFiles metadata from uploadedFiles (only filename + mimeType)
    const claimFilesMeta: ClaimFileMeta[] = (uploadedFiles || []).map((f) => ({
      filename: f.name,
      mimeType: f.type,
    }));

    const createdClaim = await onSubmit({
      ...formToCreateClaim,
      serviceLines: filteredServiceLines,
      staffId: Number(staff?.id),
      patientId: patientId,
      insuranceProvider: "MassHealth",
      appointmentId: appointmentIdToUse!,
      claimFiles: claimFilesMeta,
    });

    // 4. sending form data to selenium service
    onHandleForMHSeleniumClaim({
      ...f,
      dateOfBirth: toMMDDYYYY(f.dateOfBirth),
      serviceLines: filteredServiceLines,
      staffId: Number(staff?.id),
      patientId: patientId,
      insuranceProvider: "Mass Health",
      appointmentId: appointmentIdToUse!,
      insuranceSiteKey: "MH",
      claimId: createdClaim.id,
    });

    // 5. Close form
    onClose();
  };

  // 2st Button workflow - Mass Health Pre Auth Button Handler
  const handleMHPreAuth = async (
    formToUse?: ClaimFormData & { uploadedFiles?: File[] }
  ) => {
    // Use the passed form, or fallback to current state
    const f = formToUse ?? form;

    // 0. Validate required fields
    const missingFields: string[] = [];

    if (!f.memberId?.trim()) missingFields.push("Member ID");
    if (!f.dateOfBirth?.trim()) missingFields.push("Date of Birth");
    if (!patient?.firstName?.trim()) missingFields.push("First Name");

    if (missingFields.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: `Please fill out the following field(s): ${missingFields.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    // require at least one procedure code before proceeding
    const filteredServiceLines = (f.serviceLines || []).filter(
      (line) => (line.procedureCode ?? "").trim() !== ""
    );
    if (filteredServiceLines.length === 0) {
      toast({
        title: "No procedure codes",
        description:
          "Please add at least one procedure code before submitting the claim preAuth.",
        variant: "destructive",
      });
      return;
    }

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

    // 4. sending form data to selenium service
    onHandleForMHSeleniumClaimPreAuth({
      ...f,
      dateOfBirth: toMMDDYYYY(f.dateOfBirth),
      serviceLines: filteredServiceLines,
      staffId: Number(staff?.id),
      patientId: patientId,
      insuranceProvider: "Mass Health",
      insuranceSiteKey: "MH",
    });

    // 5. Close form
    onClose();
  };

  // 3nd Button workflow - Only Creates Data, patient, appointmetn, claim, payment, not actually submits claim to MH site.
  const handleAddService = async () => {
    // 0. Validate required fields
    const missingFields: string[] = [];

    if (!form.memberId?.trim()) missingFields.push("Member ID");
    if (!form.dateOfBirth?.trim()) missingFields.push("Date of Birth");
    if (!patient?.firstName?.trim()) missingFields.push("First Name");

    if (missingFields.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: `Please fill out the following field(s): ${missingFields.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    // require at least one procedure code before proceeding
    const filteredServiceLines = (form.serviceLines || []).filter(
      (line) => (line.procedureCode ?? "").trim() !== ""
    );
    if (filteredServiceLines.length === 0) {
      toast({
        title: "No procedure codes",
        description:
          "Please add at least one procedure code before submitting the claim.",
        variant: "destructive",
      });
      return;
    }

    // 1. Create or update appointment
    let appointmentIdToUse = appointmentId;

    if (appointmentIdToUse == null) {
      const appointmentData = {
        patientId: patientId,
        date: serviceDate,
        staffId: staff?.id,
      };
      const created = await onHandleAppointmentSubmit(appointmentData);

      if (typeof created === "number" && created > 0) {
        appointmentIdToUse = created;
      } else if (created && typeof (created as any).id === "number") {
        appointmentIdToUse = (created as any).id;
      }
    }

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
    const { uploadedFiles, insuranceSiteKey, ...formToCreateClaim } = form;

    // build claimFiles metadata from uploadedFiles (only filename + mimeType)
    const claimFilesMeta: ClaimFileMeta[] = (uploadedFiles || []).map((f) => ({
      filename: f.name,
      mimeType: f.type,
    }));

    const createdClaim = await onSubmit({
      ...formToCreateClaim,
      serviceLines: filteredServiceLines,
      staffId: Number(staff?.id),
      patientId: patientId,
      insuranceProvider: "MassHealth",
      appointmentId: appointmentIdToUse!,
      claimFiles: claimFilesMeta,
    });

    // 4. Close form
    onClose();
  };

  // for direct combo button.
  const applyComboAndThenMH = async (
    comboId: keyof typeof PROCEDURE_COMBOS
  ) => {
    const nextForm = applyComboToForm(
      form,
      comboId,
      patient?.dateOfBirth ?? "",
      { replaceAll: false, lineDate: form.serviceDate }
    );

    setForm(nextForm);
    setTimeout(() => scrollToLine(0), 0);

    await handleMHSubmit(nextForm);
  };

  // overlay click handler (close when clicking backdrop)
  const onOverlayMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // only close if clicked the backdrop itself (not inner modal)
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onMouseDown={onOverlayMouseDown}
    >
      <Card className="w-[90vw] h-[90vh] max-w-none overflow-auto bg-white relative">
        <CardHeader className="sticky top-0 z-20 flex flex-row items-center justify-between pb-2 border-b bg-white/95 backdrop-blur-sm">
          <CardTitle className="text-xl font-bold">
            Insurance Claim Form
          </CardTitle>
          <Button onClick={onClose}>
            {" "}
            <X className="w-4 h-4" />
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
                  onChange={(e) => {
                    setForm({ ...form, memberId: e.target.value });
                    updatePatientField("insuranceId", e.target.value);
                  }}
                />
              </div>
              <div>
                <Label htmlFor="dateOfBirth">Date Of Birth</Label>
                <DateInput
                  value={
                    form.dateOfBirth ? parseLocalDate(form.dateOfBirth) : null
                  }
                  onChange={(date: Date | null) => {
                    const formatted = date ? formatLocalDate(date) : "";
                    setForm((prev) => ({ ...prev, dateOfBirth: formatted }));
                    updatePatientField("dateOfBirth", formatted);
                  }}
                  disableFuture
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

            {/* Service Lines */}
            <div>
              <h3 className="text-xl font-semibold mb-2 text-center">
                Service Lines
              </h3>

              <div className="flex flex-col gap-2">
                <div className="flex justify-end items-center mb-4">
                  {/* Service Date */}
                  <div className="flex gap-2">
                    <Label className="flex items-center">Service Date</Label>
                    <Popover
                      open={serviceDateOpen}
                      onOpenChange={setServiceDateOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-[140px] justify-start text-left font-normal mr-4"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.serviceDate}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto">
                        <Calendar
                          mode="single"
                          selected={serviceDateValue}
                          onSelect={(date) => {
                            onServiceDateChange(date);
                          }}
                          onClose={() => setServiceDateOpen(false)}
                        />
                      </PopoverContent>
                    </Popover>
                    {/* Treating doctor */}
                    <Label className="flex items-center ml-2">
                      Treating Doctor
                    </Label>
                    <Select
                      value={staff?.id?.toString() || ""}
                      onValueChange={(id) => {
                        const selected = staffMembersRaw.find(
                          (member) => member.id?.toString() === id
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
                        {staffMembersRaw.map((member) => {
                          if (member.id === undefined) return null;

                          return (
                            <SelectItem
                              key={member.id}
                              value={member.id.toString()}
                            >
                              {member.name}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>

                    {/* Map Price Button */}
                    <Button
                      className="ml-4"
                      variant="success"
                      onClick={onMapPrice}
                    >
                      Map Price
                    </Button>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Section Title */}
                  <div className="text-sm font-semibold text-muted-foreground">
                    Direct Claim Submission Buttons
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    {/* CHILD RECALL GROUP */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium opacity-80">
                        Child Recall
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[
                          "childRecallDirect",
                          "childRecallDirect2BW",
                          "childRecallDirect4BW",
                          "childRecallDirect2PA2BW",
                          "childRecallDirect2PA4BW",
                          "childRecallDirectPANO",
                        ].map((comboId) => {
                          const b = PROCEDURE_COMBOS[comboId];
                          if (!b) return null;
                          const codesWithTooth = b.codes.map((code, idx) => {
                            const tooth = b.toothNumbers?.[idx];
                            return tooth ? `${code} (tooth ${tooth})` : code;
                          });
                          const tooltipText = codesWithTooth.join(", ");
                          const labelMap: Record<string, string> = {
                            childRecallDirect: "Direct",
                            childRecallDirect2BW: "Direct 2BW",
                            childRecallDirect4BW: "Direct 4BW",
                            childRecallDirect2PA2BW: "Direct 2PA 2BW",
                            childRecallDirect2PA4BW: "Direct 2PA 4BW",
                            childRecallDirectPANO: "Direct Pano",
                          };
                          return (
                            <Tooltip key={b.id}>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="secondary"
                                  onClick={() => applyComboAndThenMH(b.id)}
                                  aria-label={`${b.label} — codes: ${tooltipText}`}
                                >
                                  {labelMap[comboId] ?? b.label}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" align="center">
                                <div className="text-sm max-w-xs break-words">
                                  {tooltipText}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </div>

                    {/* ADULT RECALL GROUP */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium opacity-80">
                        Adult Recall
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[
                          "adultRecallDirect",
                          "adultRecallDirect2BW",
                          "adultRecallDirect4BW",
                          "adultRecallDirect2PA2BW",
                          "adultRecallDirect2PA4BW",
                          "adultRecallDirectPano",
                        ].map((comboId) => {
                          const b = PROCEDURE_COMBOS[comboId];
                          if (!b) return null;
                          const codesWithTooth = b.codes.map((code, idx) => {
                            const tooth = b.toothNumbers?.[idx];
                            return tooth ? `${code} (tooth ${tooth})` : code;
                          });
                          const tooltipText = codesWithTooth.join(", ");
                          const labelMap: Record<string, string> = {
                            adultRecallDirect: "Direct",
                            adultRecallDirect2BW: "Direct 2BW",
                            adultRecallDirect4BW: "Direct 4BW",
                            adultRecallDirect2PA2BW: "Direct 2PA 2BW",
                            adultRecallDirect2PA4BW: "Direct 2PA 4BW",
                            adultRecallDirectPano: "Direct Pano",
                          };
                          return (
                            <Tooltip key={b.id}>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="secondary"
                                  onClick={() => applyComboAndThenMH(b.id)}
                                  aria-label={`${b.label} — codes: ${tooltipText}`}
                                >
                                  {labelMap[comboId] ?? b.label}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" align="center">
                                <div className="text-sm max-w-xs break-words">
                                  {tooltipText}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </div>

                    {/* ORTH GROUP */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium opacity-80">Orth</div>

                      <div className="flex flex-wrap gap-2">
                        {[
                          "orthPreExamDirect",
                          "orthRecordDirect",
                          "orthPerioVisitDirect",
                          "orthRetentionDirect",
                        ].map((comboId) => {
                          const b = PROCEDURE_COMBOS[comboId];
                          if (!b) return null;

                          const tooltipText = b.codes.join(", ");

                          return (
                            <Tooltip key={b.id}>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="secondary"
                                  onClick={() => applyComboAndThenMH(b.id)}
                                  aria-label={`${b.label} — codes: ${tooltipText}`}
                                >
                                  {b.label}
                                </Button>
                              </TooltipTrigger>

                              <TooltipContent side="top" align="center">
                                <div className="text-sm max-w-xs break-words">
                                  {tooltipText}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Header */}
              <div className="grid grid-cols-[1.5fr,0.5fr,1fr,1fr,1fr,1fr,1fr] gap-1 mb-2 mt-10 font-medium text-sm text-gray-700 items-center">
                <div className="grid grid-cols-[auto,1fr] items-center gap-2">
                  <span />
                  <span className="pl-8">Procedure Code</span>
                </div>
                <span className="justify-self-center">Info</span>
                <span>Procedure Date</span>
                <span>Oral Cavity Area</span>
                <span>Tooth Number</span>
                <span>Tooth Surface</span>
                <span>Billed Amount</span>
              </div>

              {/* Dynamic Rows */}
              {form.serviceLines.map((line, i) => {
                const raw = line.procedureCode || "";
                const code = raw.trim();
                const desc = code
                  ? getDescriptionForCode(code) || "No description available"
                  : "Enter a procedure code";

                return (
                  <div
                    key={i}
                    ref={(el) => {
                      rowRefs.current[i] = el;
                      if (!el) rowRefs.current.splice(i, 1);
                    }}
                    className="scroll-mt-28 grid grid-cols-[1.5fr,0.5fr,1fr,1fr,1fr,1fr,1fr] gap-1 mb-2 items-center"
                  >
                    <div className="grid grid-cols-[auto,1fr] items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setForm((prev) => {
                            const next = {
                              ...prev,
                              serviceLines: [...prev.serviceLines],
                            };
                            next.serviceLines.splice(i, 1);
                            return next;
                          })
                        }
                        className="p-1 rounded hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" />
                      </button>
                      <Input
                        placeholder="eg. D0120"
                        value={line.procedureCode}
                        onChange={(e) =>
                          updateServiceLine(
                            i,
                            "procedureCode",
                            e.target.value.toUpperCase()
                          )
                        }
                      />
                    </div>

                    <div className="flex justify-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-sm">{desc}</div>
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    {/* Date Picker */}
                    <Popover
                      open={openProcedureDateIndex === i}
                      onOpenChange={(open) =>
                        setOpenProcedureDateIndex(open ? i : null)
                      }
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {line.procedureDate || "Pick Date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto">
                        <Calendar
                          mode="single"
                          selected={
                            line.procedureDate
                              ? new Date(line.procedureDate)
                              : undefined
                          }
                          onSelect={(date) => updateProcedureDate(i, date)}
                          onClose={() => setOpenProcedureDateIndex(null)}
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
                      placeholder="eg. B,D,F,I,L,M,O (comma-separated)"
                      value={line.toothSurface}
                      onChange={(e) => {
                        const typed = normalizeToothSurface(e.target.value);
                        updateServiceLine(i, "toothSurface", typed);
                      }}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="$0.00"
                      value={
                        line.totalBilled?.toNumber() === 0
                          ? ""
                          : line.totalBilled?.toNumber()
                      }
                      onChange={(e) => {
                        updateServiceLine(i, "totalBilled", e.target.value);
                      }}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value);
                        const rounded = Math.round(val * 100) / 100;
                        updateServiceLine(
                          i,
                          "totalBilled",
                          isNaN(rounded) ? 0 : rounded
                        );
                      }}
                    />
                  </div>
                );
              })}

              <Button
                className="mt-2"
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
                        totalBilled: new Decimal(0),
                        totalAdjusted: new Decimal(0),
                        totalPaid: new Decimal(0),
                      },
                    ],
                  }))
                }
              >
                + Add Service Line
              </Button>

              <div className="space-y-4 mt-8">
                {Object.entries(COMBO_CATEGORIES).map(([section, ids]) => (
                  <div key={section}>
                    <div className="mb-3 text-sm font-semibold opacity-70">
                      {section}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {ids.map((id) => {
                        const b = PROCEDURE_COMBOS[id];
                        if (!b) {
                          return;
                        }
                        // Build a human readable string for the tooltip
                        const codesWithTooth = b.codes.map((code, idx) => {
                          const tooth = b.toothNumbers?.[idx];
                          return tooth ? `${code} (tooth ${tooth})` : code;
                        });
                        const tooltipText = codesWithTooth.join(", ");

                        return (
                          <Tooltip key={b.id}>
                            <TooltipTrigger asChild>
                              <Button
                                key={b.id}
                                variant="secondary"
                                onClick={() =>
                                  setForm((prev) => {
                                    const next = applyComboToForm(
                                      prev,
                                      b.id as any,
                                      patient?.dateOfBirth ?? "",
                                      {
                                        replaceAll: false,
                                        lineDate: prev.serviceDate,
                                      }
                                    );

                                    setTimeout(() => scrollToLine(0), 0);

                                    return next;
                                  })
                                }
                                aria-label={`${b.label} — codes: ${tooltipText}`}
                              >
                                {b.label}
                              </Button>
                            </TooltipTrigger>

                            <TooltipContent side="top" align="center">
                              <div className="text-sm max-w-xs break-words">
                                {tooltipText}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* File Upload Section */}
            <h3 className="text-xl pt-8 font-semibold text-center">
              File Upload
            </h3>
            <div className="mt-4 bg-gray-100 p-4 rounded-md space-y-4">
              <p className="text-sm text-gray-500">
                You can upload up to 10 files. Allowed types: PDF, JPG, PNG,
                WEBP.
              </p>

              <MultipleFileUploadZone
                ref={uploadZoneRef}
                onFilesChange={handleFilesChange}
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

            {/* Missing Teeth (MassHealth Step 3) */}
            <div className="mt-8 pt-8 space-y-4">
              <h3 className="text-xl font-semibold text-center">
                Missing Teeth
              </h3>

              {/* Status selector – must match Selenium's exact case */}
              <div className="flex flex-wrap gap-2 items-center justify-center">
                <Label className="mr-2">Status</Label>

                <Button
                  type="button"
                  variant={
                    form.missingTeethStatus === "No_missing"
                      ? "default"
                      : "outline"
                  }
                  onClick={() => setMissingTeethStatus("No_missing")}
                  aria-pressed={form.missingTeethStatus === "No_missing"}
                >
                  No Missing
                </Button>

                <Button
                  type="button"
                  variant={
                    form.missingTeethStatus === "endentulous"
                      ? "default"
                      : "outline"
                  }
                  onClick={() => setMissingTeethStatus("endentulous")}
                  aria-pressed={form.missingTeethStatus === "endentulous"}
                >
                  Edentulous
                </Button>

                <Button
                  type="button"
                  variant={
                    form.missingTeethStatus === "Yes_missing"
                      ? "default"
                      : "outline"
                  }
                  onClick={() => setMissingTeethStatus("Yes_missing")}
                  aria-pressed={form.missingTeethStatus === "Yes_missing"}
                >
                  Specify Missing
                </Button>

                {form.missingTeethStatus === "Yes_missing" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearAllToothSelections}
                  >
                    Clear All
                  </Button>
                )}
              </div>

              {/* When specifying per-tooth values, show Permanent + Primary grids */}
              {form.missingTeethStatus === "Yes_missing" && (
                <MissingTeethSimple
                  value={form.missingTeeth}
                  onChange={(next) =>
                    setForm((prev) => ({ ...prev, missingTeeth: next }))
                  }
                />
              )}
            </div>

            {/* Clinical Notes Entry */}
            <div className="mt-8 pt-8 space-y-4">
              <h3 className="text-xl font-semibold text-center">Remarks</h3>
              <RemarksField
                value={form.remarks}
                onChange={(next) =>
                  setForm((prev) => ({ ...prev, remarks: next }))
                }
              />
            </div>

            {/* Insurance Carriers */}
            <div className="pt-6">
              <h3 className="text-xl font-semibold mb-4 text-center">
                Insurance Carriers
              </h3>
              <div className="flex justify-between">
                <Button
                  className="w-32"
                  variant="secondary"
                  onClick={() => handleMHSubmit()}
                >
                  MH
                </Button>
                <Button
                  className="w-32"
                  variant="secondary"
                  onClick={() => handleMHPreAuth()}
                >
                  MH PreAuth
                </Button>
                <Button
                  className="w-32"
                  variant="secondary"
                  onClick={handleAddService}
                >
                  Add Service
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
