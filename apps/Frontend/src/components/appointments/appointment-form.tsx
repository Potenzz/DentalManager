import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useDebounce } from "use-debounce";
import {
  Appointment,
  InsertAppointment,
  insertAppointmentSchema,
  Patient,
  Staff,
  UpdateAppointment,
} from "@repo/db/types";
import { DateInputField } from "@/components/ui/dateInputField";
import { formatLocalDate, parseLocalDate } from "@/utils/dateUtils";
import {
  PatientSearch,
  SearchCriteria,
} from "@/components/patients/patient-search";
import { toast } from "@/hooks/use-toast";

interface AppointmentFormProps {
  appointment?: Appointment;
  onSubmit: (data: InsertAppointment | UpdateAppointment) => void;
  onDelete?: (id: number) => void;
  onOpenChange?: (open: boolean) => void;
  isLoading?: boolean;
}

export function AppointmentForm({
  appointment,
  onSubmit,
  onDelete,
  onOpenChange,
  isLoading = false,
}: AppointmentFormProps) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [prefillPatient, setPrefillPatient] = useState<Patient | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      inputRef.current?.focus();
    }, 50); // small delay ensures content is mounted

    return () => clearTimeout(timeout);
  }, []);

  const { data: staffMembersRaw = [] as Staff[] } = useQuery<Staff[]>({
    queryKey: ["/api/staffs/"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/staffs/");
      return res.json();
    },
    enabled: !!user,
  });

  const colorMap: Record<string, string> = {
    "Dr. Kai Gao": "bg-blue-600",
    "Dr. Jane Smith": "bg-emerald-600",
  };

  const staffMembers = staffMembersRaw.map((staff) => ({
    ...staff,
    color: colorMap[staff.name] || "bg-gray-400",
  }));

  // Get the stored data from session storage
  const storedDataString = sessionStorage.getItem("newAppointmentData");
  let parsedStoredData = null;

  // Try to parse it if it exists
  if (storedDataString) {
    try {
      parsedStoredData = JSON.parse(storedDataString);
    } catch (error) {
      console.error("Error parsing stored appointment data:", error);
    }
  }

  // Format the date and times for the form
  const defaultValues: Partial<Appointment> = appointment
    ? {
        userId: user?.id,
        patientId: appointment.patientId,
        title: appointment.title,
        date: parseLocalDate(appointment.date),
        startTime: appointment.startTime || "09:00", // Default "09:00"
        endTime: appointment.endTime || "09:30", // Default "09:30"
        type: appointment.type,
        notes: appointment.notes || "",
        status: appointment.status || "scheduled",
        staffId:
          typeof appointment.staffId === "number"
            ? appointment.staffId
            : undefined,
      }
    : parsedStoredData
      ? {
          userId: user?.id,
          patientId: Number(parsedStoredData.patientId),
          date: parsedStoredData.date
            ? parseLocalDate(parsedStoredData.date)
            : parseLocalDate(new Date()),
          title: parsedStoredData.title || "",
          startTime: parsedStoredData.startTime,
          endTime: parsedStoredData.endTime,
          type: parsedStoredData.type || "checkup",
          status: parsedStoredData.status || "scheduled",
          notes: parsedStoredData.notes || "",
          staffId:
            typeof parsedStoredData.staff === "number"
              ? parsedStoredData.staff
              : (staffMembers?.[0]?.id ?? undefined),
        }
      : {
          userId: user?.id ?? 0,
          date: new Date(),
          title: "",
          startTime: "09:00",
          endTime: "09:30",
          type: "checkup",
          status: "scheduled",
          staffId: staffMembers?.[0]?.id ?? undefined,
        };

  const form = useForm<InsertAppointment>({
    resolver: zodResolver(insertAppointmentSchema),
    defaultValues,
  });

  // -----------------------------
  // PATIENT SEARCH (reuse PatientSearch)
  // -----------------------------
  const [selectOpen, setSelectOpen] = useState(false);

  // search criteria state (reused from patient page)
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria | null>(
    null
  );
  const [isSearchActive, setIsSearchActive] = useState(false);

  // debounce search criteria so we don't hammer the backend
  const [debouncedSearchCriteria] = useDebounce(searchCriteria, 300);

  const limit = 50; // dropdown size
  const offset = 0; // always first page for dropdown

  // compute key used in patient page: recent or trimmed term
  const searchKeyPart = useMemo(
    () => debouncedSearchCriteria?.searchTerm?.trim() || "recent",
    [debouncedSearchCriteria]
  );

  // Query function mirrors PatientTable logic (so backend contract is identical)
  const queryFn = async (): Promise<Patient[]> => {
    const trimmedTerm = debouncedSearchCriteria?.searchTerm?.trim();
    const isSearch = !!trimmedTerm && trimmedTerm.length > 0;
    const rawSearchBy = debouncedSearchCriteria?.searchBy || "name";
    const validSearchKeys = [
      "name",
      "phone",
      "insuranceId",
      "gender",
      "dob",
      "all",
    ];
    const searchKey = validSearchKeys.includes(rawSearchBy)
      ? rawSearchBy
      : "name";

    let url: string;
    if (isSearch) {
      const searchParams = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });

      if (searchKey === "all") {
        searchParams.set("term", trimmedTerm!);
      } else {
        searchParams.set(searchKey, trimmedTerm!);
      }

      url = `/api/patients/search?${searchParams.toString()}`;
    } else {
      url = `/api/patients/recent?limit=${limit}&offset=${offset}`;
    }

    const res = await apiRequest("GET", url);

    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({ message: "Failed to fetch patients" }));
      throw new Error(err.message || "Failed to fetch patients");
    }

    const payload = await res.json();
    // Expect payload to be { patients: Patient[], totalCount: number } or just an array.
    // Normalize: if payload.patients exists, return it; otherwise assume array of patients.
    return Array.isArray(payload) ? payload : (payload.patients ?? []);
  };

  const {
    data: patients = [],
    isFetching: isFetchingPatients,
    refetch: refetchPatients,
  } = useQuery<Patient[], Error>({
    queryKey: ["patients-dropdown", searchKeyPart],
    queryFn,
    enabled: selectOpen || !!debouncedSearchCriteria?.searchTerm,
  });

  // If select opened and no patients loaded, fetch
  useEffect(() => {
    if (selectOpen && (!patients || patients.length === 0)) {
      refetchPatients();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectOpen]);

  // Force form field values to update and clean up storage
  useEffect(() => {
    if (!parsedStoredData) return;

    // set times/staff/date as before
    if (parsedStoredData.startTime)
      form.setValue("startTime", parsedStoredData.startTime);
    if (parsedStoredData.endTime)
      form.setValue("endTime", parsedStoredData.endTime);
    if (parsedStoredData.staff)
      form.setValue("staffId", parsedStoredData.staff);
    if (parsedStoredData.date) {
      form.setValue("date", parseLocalDate(parsedStoredData.date));
    }

    // ---- patient prefill: check main cache, else fetch once ----
    if (parsedStoredData.patientId) {
      const pid = Number(parsedStoredData.patientId);
      if (!Number.isNaN(pid)) {
        // ensure the form value is set
        form.setValue("patientId", pid);

        // fetch single patient record (preferred)
        (async () => {
          try {
            const res = await apiRequest("GET", `/api/patients/${pid}`);
            if (res.ok) {
              const patientRecord = await res.json();
              setPrefillPatient(patientRecord);
            } else {
              // non-OK response: show toast with status / message
              let msg = `Failed to load patient (status ${res.status})`;
              try {
                const body = await res.json().catch(() => null);
                if (body && body.message) msg = body.message;
              } catch {}
              toast({
                title: "Could not load patient",
                description: msg,
                variant: "destructive",
              });
            }
          } catch (err) {
            toast({
              title: "Error fetching patient",
              description:
                (err as Error)?.message ||
                "An unknown error occurred while fetching patient details.",
              variant: "destructive",
            });
          } finally {
            // remove the one-time transport
            sessionStorage.removeItem("newAppointmentData");
          }
        })();
      }
    } else {
      // no patientId in storage — still remove to avoid stale state
      sessionStorage.removeItem("newAppointmentData");
    }
  }, [form]);

  // When editing an appointment, ensure we prefill the patient so SelectValue can render
  useEffect(() => {
    if (!appointment?.patientId) return;

    const pid = Number(appointment.patientId);
    if (Number.isNaN(pid)) return;

    // set form value immediately so the select has a value
    form.setValue("patientId", pid);

    // fetch the single patient record and set prefill
    (async () => {
      try {
        const res = await apiRequest("GET", `/api/patients/${pid}`);
        if (res.ok) {
          const patientRecord = await res.json();
          setPrefillPatient(patientRecord);
        } else {
          let msg = `Failed to load patient (status ${res.status})`;
          try {
            const body = await res.json().catch(() => null);
            if (body && body.message) msg = body.message;
          } catch {}
          toast({
            title: "Could not load patient",
            description: msg,
            variant: "destructive",
          });
        }
      } catch (err) {
        toast({
          title: "Error fetching patient",
          description:
            (err as Error)?.message ||
            "An unknown error occurred while fetching patient details.",
          variant: "destructive",
        });
      }
    })();
    // note: we intentionally do NOT remove prefillPatientd here; it will be cleared when dropdown opens and main list contains the patient
  }, [appointment?.patientId]);

  const handleSubmit = (data: InsertAppointment) => {
    // Make sure patientId is a number
    const patientId =
      typeof data.patientId === "string"
        ? parseInt(data.patientId, 10)
        : data.patientId;

    // Auto-create title if it's empty
    let title = data.title;
    if (!title || title.trim() === "") {
      // Format: "April 19" - just the date
      title = format(data.date, "MMMM d");
    }

    let notes = data.notes || "";

    const selectedStaff =
      staffMembers.find((staff) => staff.id?.toString() === data.staffId) ||
      staffMembers[0];

    if (!selectedStaff) {
      console.error("No staff selected and no available staff in the list");
      return; // Handle this case as well
    }

    // If there's no staff information in the notes, add it
    if (!notes.includes("Appointment with")) {
      notes = notes
        ? `${notes}\nAppointment with ${selectedStaff?.name}`
        : `Appointment with ${selectedStaff?.name}`;
    }

    const formattedDate = formatLocalDate(data.date);

    onSubmit({
      ...data,
      userId: Number(user?.id),
      title,
      notes,
      patientId,
      date: formattedDate,
      startTime: data.startTime,
      endTime: data.endTime,
    });
  };

  return (
    <div className="form-container">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(
            (data) => {
              handleSubmit(data);
            },
            (errors) => {
              console.error("Validation failed:", errors);
            }
          )}
          className="space-y-6"
        >
          <FormField
            control={form.control}
            name="patientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Patient</FormLabel>

                <Select
                  disabled={isLoading}
                  onOpenChange={(open: boolean) => {
                    setSelectOpen(open);
                    if (!open) {
                      // reset transient search state when the dropdown closes
                      setSearchCriteria(null);
                      setIsSearchActive(false);

                      // Remove transient prefill if the main cached list contains it now
                      if (
                        prefillPatient &&
                        patients &&
                        patients.some(
                          (p) => Number(p.id) === Number(prefillPatient.id)
                        )
                      ) {
                        setPrefillPatient(null);
                      }
                    } else {
                      // when opened, ensure initial results
                      if (!patients || patients.length === 0) refetchPatients();
                    }
                  }}
                  value={
                    field.value == null || // null or undefined
                    (typeof field.value === "number" &&
                      !Number.isFinite(field.value)) || // NaN/Infinity
                    (typeof field.value === "string" &&
                      field.value.trim() === "") || // empty string
                    field.value === "NaN" // defensive check
                      ? ""
                      : String(field.value)
                  }
                  onValueChange={(val) =>
                    field.onChange(val === "" ? undefined : Number(val))
                  }
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a patient" />
                    </SelectTrigger>
                  </FormControl>

                  <SelectContent>
                    {/* Reuse full PatientSearch UI inside dropdown — callbacks update the query */}
                    <div className="p-2" onKeyDown={(e) => e.stopPropagation()}>
                      <PatientSearch
                        onSearch={(criteria) => {
                          setSearchCriteria(criteria);
                          setIsSearchActive(true);
                        }}
                        onClearSearch={() => {
                          setSearchCriteria({
                            searchTerm: "",
                            searchBy: "name",
                          });
                          setIsSearchActive(false);
                        }}
                        isSearchActive={isSearchActive}
                      />
                    </div>

                    {/* Prefill patient only if main list does not already include them */}
                    {prefillPatient &&
                      !patients.some(
                        (p) => Number(p.id) === Number(prefillPatient.id)
                      ) && (
                        <SelectItem
                          key={`prefill-${prefillPatient.id}`}
                          value={prefillPatient.id?.toString() ?? ""}
                        >
                          <div className="flex flex-col items-start">
                            <span className="font-medium">
                              {prefillPatient.firstName}{" "}
                              {prefillPatient.lastName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              DOB:{" "}
                              {prefillPatient.dateOfBirth
                                ? new Date(
                                    prefillPatient.dateOfBirth
                                  ).toLocaleDateString()
                                : ""}{" "}
                              • {prefillPatient.phone ?? ""}
                            </span>
                          </div>
                        </SelectItem>
                      )}

                    <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/30">
                      {isFetchingPatients ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          Loading...
                        </div>
                      ) : patients && patients.length > 0 ? (
                        patients.map((patient) => (
                          <SelectItem
                            key={patient.id}
                            value={patient.id?.toString() ?? ""}
                          >
                            <div className="flex flex-col items-start">
                              <span className="font-medium">
                                {patient.firstName} {patient.lastName}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                DOB:{" "}
                                {new Date(
                                  patient.dateOfBirth
                                ).toLocaleDateString()}{" "}
                                • {patient.phone}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-muted-foreground text-sm">
                          No patients found
                        </div>
                      )}
                    </div>
                  </SelectContent>
                </Select>

                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Appointment Title{" "}
                  <span className="text-muted-foreground text-xs">
                    (optional)
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Leave blank to auto-fill with date"
                    {...field}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <DateInputField control={form.control} name="date" label="Date" />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Time</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="09:00"
                        {...field}
                        disabled={isLoading}
                        className="pl-10"
                        value={
                          typeof field.value === "string" ? field.value : ""
                        }
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Time</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="09:30"
                        {...field}
                        disabled={isLoading}
                        className="pl-10"
                        value={
                          typeof field.value === "string" ? field.value : ""
                        }
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Appointment Type</FormLabel>
                <Select
                  disabled={isLoading}
                  onValueChange={field.onChange}
                  value={field.value}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="checkup">Checkup</SelectItem>
                    <SelectItem value="cleaning">Cleaning</SelectItem>
                    <SelectItem value="filling">Filling</SelectItem>
                    <SelectItem value="extraction">Extraction</SelectItem>
                    <SelectItem value="root-canal">Root Canal</SelectItem>
                    <SelectItem value="crown">Crown</SelectItem>
                    <SelectItem value="dentures">Dentures</SelectItem>
                    <SelectItem value="consultation">Consultation</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  disabled={isLoading}
                  onValueChange={field.onChange}
                  value={field.value}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="no-show">No Show</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="staffId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Doctor/Hygienist</FormLabel>
                <Select
                  disabled={isLoading}
                  onValueChange={(val) => field.onChange(Number(val))}
                  value={field.value ? String(field.value) : undefined}
                  defaultValue={field.value ? String(field.value) : undefined}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff member" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {staffMembers.map((staff) => (
                      <SelectItem
                        key={staff.id}
                        value={staff.id?.toString() || ""}
                      >
                        {staff.name} ({staff.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter any notes about the appointment"
                    {...field}
                    disabled={isLoading}
                    className="min-h-24"
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isLoading} className="w-full">
            {appointment ? "Update Appointment" : "Create Appointment"}
          </Button>

          {appointment?.id && onDelete && (
            <Button
              type="button"
              onClick={() => {
                onOpenChange?.(false); // 👈 Close the modal first

                setTimeout(() => {
                  onDelete?.(appointment.id!);
                }, 300); // 300ms is safe for most animations
              }}
              className="bg-red-600 text-white w-full rounded hover:bg-red-700"
            >
              Delete Appointment
            </Button>
          )}
        </form>
      </Form>
    </div>
  );
}
