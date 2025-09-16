import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { addDays, startOfToday, addMinutes } from "date-fns";
import {
  parseLocalDate,
  formatLocalDate,
  formatLocalTime,
} from "@/utils/dateUtils";
import { AddAppointmentModal } from "@/components/appointments/add-appointment-modal";
import { Button } from "@/components/ui/button";
import {
  Calendar as CalendarIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  Move,
  Trash2,
  ShieldCheck,
  FileText,
  CreditCard,
  ClipboardList,
  StickyNote,
  Shield,
  FileCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Menu, Item, useContextMenu } from "react-contexify";
import "react-contexify/ReactContexify.css";
import { useLocation } from "wouter";
import { DeleteConfirmationDialog } from "@/components/ui/deleteDialog";
import {
  Appointment,
  InsertAppointment,
  Patient,
  UpdateAppointment,
} from "@repo/db/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

// Define types for scheduling
interface TimeSlot {
  time: string;
  displayTime: string;
}

interface Staff {
  id: string;
  name: string;
  role: "doctor" | "hygienist";
  color: string;
}

interface ScheduledAppointment {
  id?: number;
  patientId: number;
  patientName: string;
  staffId: number;
  date: string | Date;
  startTime: string | Date;
  endTime: string | Date;
  status: string | null;
  type: string;
}

// Define a unique ID for the appointment context menu
const APPOINTMENT_CONTEXT_MENU_ID = "appointment-context-menu";

// 🔑 exported base key
export const QK_APPOINTMENTS_BASE = ["appointments", "day"] as const;
// helper (optional) – mirrors the query key structure
export const qkAppointmentsDay = (date: string) =>
  [...QK_APPOINTMENTS_BASE, date] as const;

export default function AppointmentsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<
    Appointment | undefined
  >(undefined);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  const [location] = useLocation();
  const [confirmDeleteState, setConfirmDeleteState] = useState<{
    open: boolean;
    appointmentId?: number;
  }>({ open: false });

  // Create context menu hook
  const { show } = useContextMenu({
    id: APPOINTMENT_CONTEXT_MENU_ID,
  });

  // ----------------------
  // Day-level fetch: appointments + patients for selectedDate (lightweight)
  // ----------------------
  const formattedSelectedDate = formatLocalDate(selectedDate);
  type DayPayload = { appointments: Appointment[]; patients: Patient[] };
  const {
    data: dayPayload = {
      appointments: [] as Appointment[],
      patients: [] as Patient[],
    },
    isLoading: isLoadingAppointments,
    refetch: refetchAppointments,
  } = useQuery<
    DayPayload,
    Error,
    DayPayload,
    readonly [string, string, string]
  >({
    queryKey: qkAppointmentsDay(formattedSelectedDate),
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/appointments/day?date=${formattedSelectedDate}`
      );
      if (!res.ok) {
        throw new Error("Failed to load appointments for date");
      }
      return res.json();
    },
    enabled: !!user && !!formattedSelectedDate,
    // placeholderData: keepPreviousData,
  });

  const appointments = dayPayload.appointments ?? [];
  const patientsFromDay = dayPayload.patients ?? [];

  // Staff memebers
  const { data: staffMembersRaw = [] as Staff[] } = useQuery<Staff[]>({
    queryKey: ["/api/staffs/"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/staffs/");
      return res.json();
    },
    enabled: !!user,
  });

  const colors = [
    "bg-blue-600",
    "bg-emerald-600",
    "bg-purple-600",
    "bg-pink-600",
    "bg-yellow-500",
    "bg-red-600",
  ];

  // Assign colors cycling through the list
  const staffMembers = staffMembersRaw.map((staff, index) => ({
    ...staff,

    color: colors[index % colors.length] || "bg-gray-400",
  }));

  // Generate time slots from 8:00 AM to 6:00 PM in 30-minute increments
  const timeSlots: TimeSlot[] = [];
  for (let hour = 8; hour <= 18; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const hour12 = hour > 12 ? hour - 12 : hour;
      const period = hour >= 12 ? "PM" : "AM";
      const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      const displayTime = `${hour12}:${minute.toString().padStart(2, "0")} ${period}`;
      timeSlots.push({ time: timeStr, displayTime });
    }
  }

  // Check for newPatient parameter in URL
  useEffect(() => {
    // Parse URL search params to check for newPatient
    const params = new URLSearchParams(window.location.search);
    const newPatientId = params.get("newPatient");

    if (newPatientId) {
      const patientId = parseInt(newPatientId);
      // Choose first available staff safely (fallback to 1 if none)
      const firstStaff =
        staffMembers && staffMembers.length > 0 ? staffMembers[0] : undefined;
      const staffId = firstStaff ? Number(firstStaff.id) : 1;
      // Find first time slot today (9:00 AM is a common starting time)
      const defaultTimeSlot =
        timeSlots.find((slot) => slot.time === "09:00") || timeSlots[0];
      if (!defaultTimeSlot) {
        toast({
          title: "Unable to schedule",
          description:
            "No available time slots to schedule the new patient right now.",
          variant: "destructive",
        });
        return;
      }

      // Merge any existing "newAppointmentData" with the patient info BEFORE opening modal
      try {
        const existingRaw = sessionStorage.getItem("newAppointmentData");
        const existing = existingRaw ? JSON.parse(existingRaw) : {};
        const newAppointmentData = {
          ...existing,
          patientId: patientId,
        };
        sessionStorage.setItem(
          "newAppointmentData",
          JSON.stringify(newAppointmentData)
        );
      } catch (err) {
        // If sessionStorage parsing fails, overwrite with a fresh object
        sessionStorage.setItem(
          "newAppointmentData",
          JSON.stringify({ patientId: patientId })
        );
      }

      // Open/create the appointment modal (will read sessionStorage in the modal)
      handleCreateAppointmentAtSlot(defaultTimeSlot, Number(staffId));

      // Remove the query param from the URL so this doesn't re-run on navigation/refresh
      params.delete("newPatient");
      const newSearch = params.toString();
      const newUrl = `${window.location.pathname}${newSearch ? `?${newSearch}` : ""}${window.location.hash || ""}`;
      window.history.replaceState({}, "", newUrl);
    }
  }, [location]);

  // Create/upsert appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (appointment: InsertAppointment) => {
      const res = await apiRequest(
        "POST",
        "/api/appointments/upsert",
        appointment
      );
      return await res.json();
    },
    onSuccess: (appointment) => {
      toast({
        title: "Appointment Scheduled",
        description: appointment.message || "Appointment created successfully.",
      });
      // Invalidate both appointments and patients queries
      queryClient.invalidateQueries({
        queryKey: qkAppointmentsDay(formattedSelectedDate),
      });
      setIsAddModalOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create appointment: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update appointment mutation
  const updateAppointmentMutation = useMutation({
    mutationFn: async ({
      id,
      appointment,
    }: {
      id: number;
      appointment: UpdateAppointment;
    }) => {
      const res = await apiRequest(
        "PUT",
        `/api/appointments/${id}`,
        appointment
      );
      return await res.json();
    },
    onSuccess: (appointment) => {
      toast({
        title: "Appointment Scheduled",
        description: appointment.message || "Appointment updated successfully.",
      });
      queryClient.invalidateQueries({
        queryKey: qkAppointmentsDay(formattedSelectedDate),
      });
      setEditingAppointment(undefined);
      setIsAddModalOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update appointment: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete appointment mutation
  const deleteAppointmentMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/appointments/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Appointment deleted successfully.",
      });
      // Invalidate both appointments and patients queries
      queryClient.invalidateQueries({
        queryKey: qkAppointmentsDay(formattedSelectedDate),
      });
      setConfirmDeleteState({ open: false });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete appointment: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle appointment submission (create or update)
  const handleAppointmentSubmit = (
    appointmentData: InsertAppointment | UpdateAppointment
  ) => {
    // Converts local date to exact UTC date with no offset issues
    const rawDate = parseLocalDate(appointmentData.date);

    const updatedData = {
      ...appointmentData,
      date: formatLocalDate(rawDate),
    };

    // Check if we're editing an existing appointment with a valid ID
    if (
      editingAppointment &&
      "id" in editingAppointment &&
      typeof editingAppointment.id === "number"
    ) {
      updateAppointmentMutation.mutate({
        id: editingAppointment.id,
        appointment: updatedData as unknown as UpdateAppointment,
      });
    } else {
      // This is a new appointment
      if (user) {
        createAppointmentMutation.mutate({
          ...(updatedData as unknown as InsertAppointment),
          userId: user.id,
        });
      }
    }
  };

  // Handle edit appointment
  const handleEditAppointment = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setIsAddModalOpen(true);
  };

  // When user confirms delete in dialog
  const handleConfirmDelete = () => {
    if (!confirmDeleteState.appointmentId) return;
    deleteAppointmentMutation.mutate(confirmDeleteState.appointmentId);
  };

  const handleDeleteAppointment = (id: number) => {
    setConfirmDeleteState({
      open: true,
      appointmentId: id,
    });
  };

  // Process appointments for the scheduler view
  const processedAppointments: ScheduledAppointment[] = (
    appointments ?? []
  ).map((apt) => {
    // Find patient name
    const patient = patientsFromDay.find((p) => p.id === apt.patientId);
    const patientName = patient
      ? `${patient.firstName} ${patient.lastName}`
      : "Unknown Patient";

    const staffId = Number(apt.staffId ?? 1);

    const normalizedStart =
      typeof apt.startTime === "string"
        ? apt.startTime.substring(0, 5)
        : formatLocalTime(apt.startTime);
    const normalizedEnd =
      typeof apt.endTime === "string"
        ? apt.endTime.substring(0, 5)
        : formatLocalTime(apt.endTime);

    const processed = {
      ...apt,
      patientName,
      staffId,
      status: apt.status ?? null,
      date: formatLocalDate(parseLocalDate(apt.date)),
      startTime: normalizedStart,
      endTime: normalizedEnd,
    } as ScheduledAppointment;

    return processed;
  });

  // Check if appointment exists at a specific time slot and staff
  const getAppointmentAtSlot = (timeSlot: TimeSlot, staffId: number) => {
    if (!processedAppointments || processedAppointments.length === 0)
      return undefined;

    // In appointments for a given time slot, we'll just display the first one
    // In a real application, you might want to show multiple or stack them
    const appointmentsAtSlot = processedAppointments.filter((apt) => {
      const dbTime =
        typeof apt.startTime === "string" ? apt.startTime.substring(0, 5) : "";
      const timeMatches = dbTime === timeSlot.time;
      const staffMatches = apt.staffId === staffId;
      return timeMatches && staffMatches;
    });

    return appointmentsAtSlot.length > 0 ? appointmentsAtSlot[0] : undefined;
  };

  const isLoading =
    isLoadingAppointments ||
    createAppointmentMutation.isPending ||
    updateAppointmentMutation.isPending ||
    deleteAppointmentMutation.isPending;

  // Define drag item types
  const ItemTypes = {
    APPOINTMENT: "appointment",
  };

  // Handle creating a new appointment at a specific time slot and for a specific staff member
  const handleCreateAppointmentAtSlot = (
    timeSlot: TimeSlot,
    staffId: number
  ) => {
    // Calculate end time (30 minutes after start time)
    const startHour = parseInt(timeSlot.time.split(":")[0] as string);
    const startMinute = parseInt(timeSlot.time.split(":")[1] as string);
    const startDate = parseLocalDate(selectedDate);
    startDate.setHours(startHour, startMinute, 0);

    const endDate = addMinutes(startDate, 30);
    const endTime = `${endDate.getHours().toString().padStart(2, "0")}:${endDate.getMinutes().toString().padStart(2, "0")}`;

    // Find staff member
    const staff = staffMembers.find((s) => Number(s.id) === Number(staffId));

    // Try to read any existing prefill data (may include patientId from the URL handler)
    let existingStored: any = null;
    try {
      const raw = sessionStorage.getItem("newAppointmentData");
      existingStored = raw ? JSON.parse(raw) : null;
    } catch (e) {
      // ignore parse errors and treat as no existing stored data
      existingStored = null;
    }

    // Build the prefill appointment object and merge existing stored data
    const newAppointment = {
      // base defaults
      date: formatLocalDate(selectedDate),
      startTime: timeSlot.time, // This is in "HH:MM" format
      endTime: endTime,
      type: staff?.role === "doctor" ? "checkup" : "cleaning",
      status: "scheduled",
      title: `Appointment with ${staff?.name}`,
      notes: `Appointment with ${staff?.name}`,
      staff: Number(staffId), // consistent field name that matches update mutation
      // if existingStored has patientId (or other fields) merge them below
      ...(existingStored || {}),
    };

    // Ensure explicit values from this function override stale values from storage
    // (for example, prefer current slot and staff)
    const mergedAppointment = {
      ...newAppointment,
      date: newAppointment.date,
      startTime: newAppointment.startTime,
      endTime: newAppointment.endTime,
      staff: Number(staffId),
    };

    // Persist merged prefill so the modal/form can read it
    try {
      sessionStorage.setItem(
        "newAppointmentData",
        JSON.stringify(mergedAppointment)
      );
    } catch (e) {
      // ignore sessionStorage write failures
      console.error("Failed to write newAppointmentData to sessionStorage", e);
    }

    // For new appointments, set editingAppointment to undefined
    setEditingAppointment(undefined);

    // Open modal
    setIsAddModalOpen(true);
  };

  // Handle moving an appointment to a new time slot and staff
  const handleMoveAppointment = (
    appointmentId: number,
    newTimeSlot: TimeSlot,
    newStaffId: number
  ) => {
    const appointment = appointments.find((a) => a.id === appointmentId);
    if (!appointment) return;

    // Calculate new end time (30 minutes from start)
    const startHour = parseInt(newTimeSlot.time.split(":")[0] as string);
    const startMinute = parseInt(newTimeSlot.time.split(":")[1] as string);
    const startDate = parseLocalDate(selectedDate);
    startDate.setHours(startHour, startMinute, 0);

    const endDate = addMinutes(startDate, 30);
    const endTime = `${endDate.getHours().toString().padStart(2, "0")}:${endDate.getMinutes().toString().padStart(2, "0")}`;

    // Find staff member
    const staff = staffMembers.find((s) => Number(s.id) === newStaffId);

    // Update appointment data
    const { id, createdAt, ...sanitizedAppointment } = appointment;
    const updatedAppointment: UpdateAppointment = {
      ...sanitizedAppointment,
      startTime: newTimeSlot.time, // Already in HH:MM format
      endTime: endTime, // Already in HH:MM format
      notes: `Appointment with ${staff?.name}`,
      staffId: newStaffId, // Update staffId
    };
    // Call update mutation
    updateAppointmentMutation.mutate({
      id: appointmentId,
      appointment: updatedAppointment,
    });
  };

  // Function to display context menu
  const handleContextMenu = (e: React.MouseEvent, appointmentId: number) => {
    // Prevent the default browser context menu
    e.preventDefault();

    // Show our custom context menu with appointment ID as data
    show({
      event: e,
      props: {
        appointmentId,
      },
    });
  };

  // Create a draggable appointment component
  function DraggableAppointment({
    appointment,
    staff,
  }: {
    appointment: ScheduledAppointment;
    staff: Staff;
  }) {
    const [{ isDragging }, drag] = useDrag(() => ({
      type: ItemTypes.APPOINTMENT,
      item: { id: appointment.id },
      collect: (monitor) => ({
        isDragging: !!monitor.isDragging(),
      }),
    }));

    return (
      <div
        ref={drag as unknown as React.RefObject<HTMLDivElement>} // Type assertion to make TypeScript happy
        className={`${staff.color} border border-white shadow-md text-white rounded p-1 text-xs h-full overflow-hidden cursor-move relative ${
          isDragging ? "opacity-50" : "opacity-100"
        }`}
        style={{ fontWeight: 500 }}
        onClick={(e) => {
          // Only allow edit on click if we're not dragging
          if (!isDragging) {
            const fullAppointment = appointments.find(
              (a) => a.id === appointment.id
            );
            if (fullAppointment) {
              e.stopPropagation();
              handleEditAppointment(fullAppointment);
            }
          }
        }}
        onContextMenu={(e) => handleContextMenu(e, appointment.id ?? 0)}
      >
        <div className="font-bold truncate flex items-center gap-1">
          <Move className="h-3 w-3" />
          {appointment.patientName}
        </div>
        <div className="truncate">{appointment.type}</div>
      </div>
    );
  }

  // Create a drop target for appointments
  function DroppableTimeSlot({
    timeSlot,
    staffId,
    appointment,
    staff,
  }: {
    timeSlot: TimeSlot;
    staffId: number;
    appointment: ScheduledAppointment | undefined;
    staff: Staff;
  }) {
    const [{ isOver, canDrop }, drop] = useDrop(() => ({
      accept: ItemTypes.APPOINTMENT,
      drop: (item: { id: number }) => {
        handleMoveAppointment(item.id, timeSlot, staffId);
      },
      canDrop: (item: { id: number }) => {
        // Prevent dropping if there's already an appointment here
        return !appointment;
      },
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
        canDrop: !!monitor.canDrop(),
      }),
    }));

    return (
      <td
        ref={drop as unknown as React.RefObject<HTMLTableCellElement>}
        key={`${timeSlot.time}-${staffId}`}
        className={`px-1 py-1 border relative h-14 ${isOver && canDrop ? "bg-green-100" : ""}`}
      >
        {appointment ? (
          <DraggableAppointment appointment={appointment} staff={staff} />
        ) : (
          <button
            className={`w-full h-full ${isOver && canDrop ? "bg-green-100" : "text-gray-400 hover:bg-gray-100"} rounded flex items-center justify-center`}
            onClick={() => handleCreateAppointmentAtSlot(timeSlot, staffId)}
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </td>
    );
  }

  // -------------------
  const handleCheckEligibility = (appointmentId: number) => {
    console.log(`Checking eligibility for appointment: ${appointmentId}`);
  };

  const handleClaimsPreAuth = (appointmentId: number) => {
    console.log(`Opening Claims/PreAuth for appointment: ${appointmentId}`);
  };

  const handlePayments = (appointmentId: number) => {
    console.log(`Processing payments for appointment: ${appointmentId}`);
  };

  const handleChartPlan = (appointmentId: number) => {
    console.log(
      `Viewing chart/treatment plan for appointment: ${appointmentId}`
    );
  };

  const handleClinicNotes = (appointmentId: number) => {
    console.log(`Opening clinic notes for appointment: ${appointmentId}`);
  };

  return (
    <div className="">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Appointment Schedule
            </h1>
            <p className="text-muted-foreground">
              View and manage the dental practice schedule
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingAppointment(undefined);
              setIsAddModalOpen(true);
            }}
            className="gap-1"
            disabled={isLoading}
          >
            <Plus className="h-4 w-4" />
            New Appointment
          </Button>
        </div>

        {/* Context Menu */}
        <Menu id={APPOINTMENT_CONTEXT_MENU_ID} animation="fade">
          <Item
            onClick={({ props }) => {
              const fullAppointment = appointments.find(
                (a) => a.id === props.appointmentId
              );
              if (fullAppointment) {
                handleEditAppointment(fullAppointment);
              }
            }}
          >
            <span className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Edit Appointment
            </span>
          </Item>
          <Item
            onClick={({ props }) =>
              handleDeleteAppointment(props.appointmentId)
            }
          >
            <span className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-4 w-4" />
              Delete Appointment
            </span>
          </Item>

          {/* Check Eligibility */}
          <Item
            onClick={({ props }) => handleCheckEligibility(props.appointmentId)}
          >
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Check Eligibility
            </span>
          </Item>

          {/* Claims / PreAuth */}
          <Item
            onClick={({ props }) => handleClaimsPreAuth(props.appointmentId)}
          >
            <span className="flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              Claims / PreAuth
            </span>
          </Item>

          {/* Payments */}
          <Item onClick={({ props }) => handlePayments(props.appointmentId)}>
            <span className="flex items-center gap-2 text-green-600">
              <CreditCard className="h-4 w-4" />
              Payments
            </span>
          </Item>

          {/* Chart / Treatment Plan */}
          <Item onClick={({ props }) => handleChartPlan(props.appointmentId)}>
            <span className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Chart / Treatment Plan
            </span>
          </Item>

          {/* Clinic Notes */}
          <Item onClick={({ props }) => handleClinicNotes(props.appointmentId)}>
            <span className="flex items-center gap-2 text-yellow-600">
              <StickyNote className="h-4 w-4" />
              Clinic Notes
            </span>
          </Item>
        </Menu>

        {/* Main Content  */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Schedule Grid */}
          <div className="w-full overflow-x-auto bg-white rounded-md shadow">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSelectedDate(addDays(selectedDate, -1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-xl font-semibold">
                    {formattedSelectedDate}
                  </h2>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Top button with popover calendar */}
                <div className="flex items-center gap-2">
                  <Label className="hidden sm:flex">Selected</Label>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-[160px] justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate
                          ? selectedDate.toLocaleDateString()
                          : "Pick a date"}
                      </Button>
                    </PopoverTrigger>

                    <PopoverContent className="w-auto">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          if (date) setSelectedDate(date);
                        }}
                        onClose={() => setCalendarOpen(false)}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* Schedule Grid with Drag and Drop */}
            <DndProvider backend={HTML5Backend}>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[800px]">
                  <thead>
                    <tr>
                      <th className="p-2 border bg-gray-50 w-[100px]">Time</th>
                      {staffMembers.map((staff) => (
                        <th
                          key={staff.id}
                          className={`p-2 border bg-gray-50 ${staff.role === "doctor" ? "font-bold" : ""}`}
                        >
                          {staff.name}
                          <div className="text-xs text-gray-500">
                            {staff.role}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {timeSlots.map((timeSlot) => (
                      <tr key={timeSlot.time}>
                        <td className="border px-2 py-1 text-xs text-gray-600 font-medium">
                          {timeSlot.displayTime}
                        </td>
                        {staffMembers.map((staff) => (
                          <DroppableTimeSlot
                            key={`${timeSlot.time}-${staff.id}`}
                            timeSlot={timeSlot}
                            staffId={Number(staff.id)}
                            appointment={getAppointmentAtSlot(
                              timeSlot,
                              Number(staff.id)
                            )}
                            staff={staff}
                          />
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DndProvider>
          </div>
        </div>
      </div>

      {/* Add/Edit Appointment Modal */}
      <AddAppointmentModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSubmit={handleAppointmentSubmit}
        isLoading={
          createAppointmentMutation.isPending ||
          updateAppointmentMutation.isPending
        }
        appointment={editingAppointment}
        onDelete={handleDeleteAppointment}
      />

      <DeleteConfirmationDialog
        isOpen={confirmDeleteState.open}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteState({ open: false })}
        entityName={String(confirmDeleteState.appointmentId)}
      />
    </div>
  );
}
