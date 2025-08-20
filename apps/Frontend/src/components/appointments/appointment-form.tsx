import { useEffect, useRef, useState } from "react";
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

interface AppointmentFormProps {
  appointment?: Appointment;
  patients: Patient[];
  onSubmit: (data: InsertAppointment | UpdateAppointment) => void;
  onDelete?: (id: number) => void;
  onOpenChange?: (open: boolean) => void;
  isLoading?: boolean;
}

export function AppointmentForm({
  appointment,
  patients,
  onSubmit,
  onDelete,
  onOpenChange,
  isLoading = false,
}: AppointmentFormProps) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const timeout = setTimeout(() => {
      inputRef.current?.focus();
    }, 50); // small delay ensures content is mounted

    return () => clearTimeout(timeout);
  }, []);

  const { data: staffMembersRaw = [] as Staff[], isLoading: isLoadingStaff } =
    useQuery<Staff[]>({
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

  function parseLocalDate(dateString: string): Date {
    const parts = dateString.split("-");
    if (parts.length !== 3) {
      return new Date();
    }
    const year = parseInt(parts[0] ?? "", 10);
    const month = parseInt(parts[1] ?? "", 10);
    const day = parseInt(parts[2] ?? "", 10);

    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return new Date();
    }

    // Create date at UTC midnight instead of local midnight
    return new Date(year, month - 1, day);
  }

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
        date:
          typeof appointment.date === "string"
            ? parseLocalDate(appointment.date)
            : appointment.date,
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
            ? typeof parsedStoredData.date === "string"
              ? parseLocalDate(parsedStoredData.date)
              : new Date(parsedStoredData.date) // in case it’s a stringified date or timestamp
            : new Date(),

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

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 200); // 1 seconds
  const [filteredPatients, setFilteredPatients] = useState(patients);

  useEffect(() => {
    if (!debouncedSearchTerm.trim()) {
      setFilteredPatients(patients);
    } else {
      const term = debouncedSearchTerm.toLowerCase();
      setFilteredPatients(
        patients.filter((p) =>
          `${p.firstName} ${p.lastName} ${p.phone} ${p.dateOfBirth}`
            .toLowerCase()
            .includes(term)
        )
      );
    }
  }, [debouncedSearchTerm, patients]);

  // Force form field values to update and clean up storage
  useEffect(() => {
    if (parsedStoredData) {
      // Update form field values directly
      if (parsedStoredData.startTime) {
        form.setValue("startTime", parsedStoredData.startTime);
      }

      if (parsedStoredData.endTime) {
        form.setValue("endTime", parsedStoredData.endTime);
      }

      if (parsedStoredData.staff) {
        form.setValue("staffId", parsedStoredData.staff);
      }

      if (parsedStoredData.date) {
        const parsedDate =
          typeof parsedStoredData.date === "string"
            ? parseLocalDate(parsedStoredData.date)
            : new Date(parsedStoredData.date);
        form.setValue("date", parsedDate);
      }

      // Clean up session storage
      sessionStorage.removeItem("newAppointmentData");
    }
  }, [form]);

  const handleSubmit = (data: InsertAppointment) => {
    // Make sure patientId is a number
    const patientId =
      typeof data.patientId === "string"
        ? parseInt(data.patientId, 10)
        : data.patientId;

    // Get patient name for the title
    const patient = patients.find((p) => p.id === patientId);
    const patientName = patient
      ? `${patient.firstName} ${patient.lastName}`
      : "Patient";

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

    const formattedDate = data.date.toLocaleDateString("en-CA");

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
                  onValueChange={(val) => field.onChange(Number(val))}
                  value={field.value?.toString()}
                  defaultValue={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a patient" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <div className="p-2" onKeyDown={(e) => e.stopPropagation()}>
                      <Input
                        ref={inputRef}
                        placeholder="Search patients..."
                        className="w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => {
                          const navKeys = ["ArrowDown", "ArrowUp", "Enter"];
                          if (!navKeys.includes(e.key)) {
                            e.stopPropagation(); // Only stop keys that affect select state
                          }
                        }}
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/30">
                      {filteredPatients.length > 0 ? (
                        filteredPatients.map((patient) => (
                          <SelectItem
                            key={patient.id}
                            value={patient.id?.toString() ?? ""}
                          >
                            <div className="flex flex-col">
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

          <DateInputField
            control={form.control}
            name="date"
            label="Date"
            disablePast
          />

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
