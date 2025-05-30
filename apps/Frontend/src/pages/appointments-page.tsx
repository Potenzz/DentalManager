import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, addDays, startOfToday, addMinutes } from "date-fns";
import { TopAppBar } from "@/components/layout/top-app-bar";
import { Sidebar } from "@/components/layout/sidebar";
import { AddAppointmentModal } from "@/components/appointments/add-appointment-modal";
import { ClaimModal } from "@/components/claims/claim-modal";
import { Button } from "@/components/ui/button";
import {
  Calendar as CalendarIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Move,
  Trash2,
  FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Calendar } from "@/components/ui/calendar";
import {
  AppointmentUncheckedCreateInputObjectSchema,
  PatientUncheckedCreateInputObjectSchema,
} from "@repo/db/usedSchemas";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Menu, Item, useContextMenu } from "react-contexify";
import "react-contexify/ReactContexify.css";
import { useLocation } from "wouter";
import { DeleteConfirmationDialog } from "@/components/ui/deleteDialog";

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

const PatientSchema = (
  PatientUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
).omit({
  appointments: true,
});
type Patient = z.infer<typeof PatientSchema>;

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

export default function AppointmentsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimAppointmentId, setClaimAppointmentId] = useState<number | null>(
    null
  );
  const [claimPatientId, setClaimPatientId] = useState<number | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<
    Appointment | undefined
  >(undefined);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  const [confirmDeleteState, setConfirmDeleteState] = useState<{
    open: boolean;
    appointmentId?: number;
    appointmentTitle?: string;
  }>({ open: false });

  // Create context menu hook
  const { show } = useContextMenu({
    id: APPOINTMENT_CONTEXT_MENU_ID,
  });

  //Fetching staff memebers
  const { data: staffMembersRaw = [] as Staff[], isLoading: isLoadingStaff } =
    useQuery<Staff[]>({
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

  // Fetch appointments
  const {
    data: appointments = [] as Appointment[],
    isLoading: isLoadingAppointments,
    refetch: refetchAppointments,
  } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments/all"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/appointments/all");
      return res.json();
    },
    enabled: !!user,
  });

  // Fetch patients (needed for the dropdowns)
  const { data: patients = [], isLoading: isLoadingPatients } = useQuery<
    Patient[]
  >({
    queryKey: ["/api/patients/"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/patients/");
      return res.json();
    },
    enabled: !!user,
  });

  // Handle creating a new appointment at a specific time slot and for a specific staff member
  const handleCreateAppointmentAtSlot = (
    timeSlot: TimeSlot,
    staffId: number
  ) => {
    // Calculate end time (30 minutes after start time)
    const startHour = parseInt(timeSlot.time.split(":")[0] as string);
    const startMinute = parseInt(timeSlot.time.split(":")[1] as string);
    const startDate = new Date(selectedDate);
    startDate.setHours(startHour, startMinute, 0);

    const endDate = addMinutes(startDate, 30);
    const endTime = `${endDate.getHours().toString().padStart(2, "0")}:${endDate.getMinutes().toString().padStart(2, "0")}`;

    // Find staff member
    const staff = staffMembers.find((s) => Number(s.id) === Number(staffId));

    // Pre-fill appointment form with default values
    const newAppointment = {
      date: format(selectedDate, "yyyy-MM-dd"),
      startTime: timeSlot.time, // This is in "HH:MM" format
      endTime: endTime,
      type: staff?.role === "doctor" ? "checkup" : "cleaning",
      status: "scheduled",
      title: `Appointment with ${staff?.name}`, // Add staff name in title for easier display
      notes: `Appointment with ${staff?.name}`, // Store staff info in notes for processing
      staff: staffId, // This matches the 'staff' field in the appointment form schema
    };

    // For new appointments, set editingAppointment to undefined
    // This will ensure we go to the "create" branch in handleAppointmentSubmit
    setEditingAppointment(undefined);

    // But still pass the pre-filled data to the modal
    setIsAddModalOpen(true);

    // Store the prefilled values in state or sessionStorage to access in the modal
    // Clear any existing data first to ensure we're not using old data
    sessionStorage.removeItem("newAppointmentData");
    sessionStorage.setItem(
      "newAppointmentData",
      JSON.stringify(newAppointment)
    );
  };

  // Check for newPatient parameter in URL
  useEffect(() => {
    if (patients.length === 0 || !user) return;

    // Parse URL search params to check for newPatient
    const params = new URLSearchParams(window.location.search);
    const newPatientId = params.get("newPatient");

    if (newPatientId) {
      const patientId = parseInt(newPatientId);
      // Find the patient in our list
      const patient = (patients as Patient[]).find((p) => p.id === patientId);

      if (patient) {
        toast({
          title: "Patient Added",
          description: `${patient.firstName} ${patient.lastName} was added successfully. You can now schedule an appointment.`,
        });

        // Select first available staff member
        const staffId = staffMembers[0]!.id;

        // Find first time slot today (9:00 AM is a common starting time)
        const defaultTimeSlot =
          timeSlots.find((slot) => slot.time === "09:00") || timeSlots[0];

        // Open appointment modal with prefilled patient
        handleCreateAppointmentAtSlot(defaultTimeSlot!, Number(staffId));

        // Pre-select the patient in the appointment form
        const patientData = {
          patientId: patient.id,
        };

        // Store info in session storage for the modal to pick up
        const existingData = sessionStorage.getItem("newAppointmentData");
        if (existingData) {
          const parsedData = JSON.parse(existingData);
          sessionStorage.setItem(
            "newAppointmentData",
            JSON.stringify({
              ...parsedData,
              ...patientData,
            })
          );
        }
      }
    }
  }, [patients, user, location]);

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (appointment: InsertAppointment) => {
      const res = await apiRequest("POST", "/api/appointments/", appointment);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Appointment created successfully.",
      });
      // Invalidate both appointments and patients queries
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients/"] });
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
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Appointment updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients/"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients/"] });
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

    function parseLocalDate(dateInput: Date | string): Date {
      if (dateInput instanceof Date) return dateInput;

      const parts = dateInput.split("-");
      if (parts.length !== 3) {
        throw new Error(`Invalid date format: ${dateInput}`);
      }

      const year = Number(parts[0]);
      const month = Number(parts[1]);
      const day = Number(parts[2]);

      if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
        throw new Error(`Invalid date parts in date string: ${dateInput}`);
      }

      return new Date(year, month - 1, day); // month is 0-indexed
    }

    const rawDate = parseLocalDate(appointmentData.date);

    const updatedData = {
      ...appointmentData,
      date: rawDate.toLocaleDateString("en-CA"),
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
    const appointment = appointments.find((a) => a.id === id);
    if (!appointment) return;

    // Find patient by patientId
    const patient = patients.find((p) => p.id === appointment.patientId);

    setConfirmDeleteState({
      open: true,
      appointmentId: id,
      appointmentTitle: `${patient?.firstName ?? "Appointment"}`,
    });
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Get formatted date string for display
  const formattedDate = format(selectedDate, "yyyy-MM-dd");

  const selectedDateAppointments = appointments.filter((appointment) => {
    const dateObj =
      typeof appointment.date === "string"
        ? new Date(appointment.date)
        : appointment.date;

    // Extract UTC year, month, day
    const year = dateObj.getUTCFullYear();
    const month = dateObj.getUTCMonth(); // zero-based
    const day = dateObj.getUTCDate();

    // Create a date string in UTC format
    const utcDateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    return utcDateStr === formattedDate; // formattedDate should be 'yyyy-MM-dd' string in UTC format as well
  });

  // Process appointments for the scheduler view
  const processedAppointments: ScheduledAppointment[] =
    selectedDateAppointments.map((apt) => {
      // Find patient name
      const patient = patients.find((p) => p.id === apt.patientId);
      const patientName = patient
        ? `${patient.firstName} ${patient.lastName}`
        : "Unknown Patient";

      let staffId: number;

      if (
        staffMembers &&
        staffMembers.length > 0 &&
        staffMembers[0] !== undefined &&
        staffMembers[0].id !== undefined
      ) {
        staffId = Number(apt.staffId);
      } else {
        staffId = 1;
      }

      const processed = {
        ...apt,
        patientName,
        staffId,
        status: apt.status ?? null, // Default to null if status is undefined
        date: apt.date instanceof Date ? apt.date.toISOString() : apt.date, // Ensure d
      };

      return processed;
    });

  // Check if appointment exists at a specific time slot and staff
  const getAppointmentAtSlot = (timeSlot: TimeSlot, staffId: number) => {
    if (processedAppointments.length === 0) {
      return undefined;
    }

    // In appointments for a given time slot, we'll just display the first one
    // In a real application, you might want to show multiple or stack them
    const appointmentsAtSlot = processedAppointments.filter((apt) => {
      // Fix time format comparison - the database adds ":00" seconds to the time
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
    isLoadingPatients ||
    createAppointmentMutation.isPending ||
    updateAppointmentMutation.isPending ||
    deleteAppointmentMutation.isPending;

  // Define drag item types
  const ItemTypes = {
    APPOINTMENT: "appointment",
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
    const startDate = new Date(selectedDate);
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

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopAppBar toggleMobileMenu={toggleMobileMenu} />

        <main className="flex-1 overflow-y-auto p-4">
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
                onClick={({ props }) => {
                  const fullAppointment = appointments.find(
                    (a) => a.id === props.appointmentId
                  );
                  if (fullAppointment) {
                    // Set the appointment and patient IDs for the claim modal
                    setClaimAppointmentId(fullAppointment.id ?? null);
                    setClaimPatientId(fullAppointment.patientId);

                    // Find the patient name for the toast notification
                    const patient = patients.find(
                      (p) => p.id === fullAppointment.patientId
                    );
                    const patientName = patient
                      ? `${patient.firstName} ${patient.lastName}`
                      : `Patient #${fullAppointment.patientId}`;

                    // Show a toast notification
                    toast({
                      title: "Claim Services Initiated",
                      description: `Started insurance claim process for ${patientName}`,
                    });

                    // Open the claim modal
                    setIsClaimModalOpen(true);
                  }
                }}
              >
                <span className="flex items-center gap-2 text-blue-600">
                  <FileText className="h-4 w-4" />
                  Claim Services
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
            </Menu>

            {/* Main Content - Split into Schedule and Calendar */}
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left side - Schedule Grid */}
              <div className="w-full lg:w-3/4 overflow-x-auto bg-white rounded-md shadow">
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          setSelectedDate(addDays(selectedDate, -1))
                        }
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <h2 className="text-xl font-semibold">{formattedDate}</h2>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          setSelectedDate(addDays(selectedDate, 1))
                        }
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Schedule Grid with Drag and Drop */}
                <DndProvider backend={HTML5Backend}>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse min-w-[800px]">
                      <thead>
                        <tr>
                          <th className="p-2 border bg-gray-50 w-[100px]">
                            Time
                          </th>
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

              {/* Right side - Calendar and Stats */}
              <div className="w-full lg:w-1/4 space-y-6">
                {/* Calendar Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Calendar</CardTitle>
                    <CardDescription>
                      Select a date to view or schedule appointments
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (date) setSelectedDate(date);
                      }}
                      className="rounded-md border"
                    />
                  </CardContent>
                </Card>

                {/* Statistics Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between">
                      <span>Appointments</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => refetchAppointments()}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                    <CardDescription>
                      Statistics for {formattedDate}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">
                          Total appointments:
                        </span>
                        <span className="font-semibold">
                          {selectedDateAppointments.length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">
                          With doctors:
                        </span>
                        <span className="font-semibold">
                          {
                            processedAppointments.filter(
                              (apt) =>
                                staffMembers.find((s) => Number(s.id) === apt.staffId)
                                  ?.role === "doctor"
                            ).length
                          }
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">
                          With hygienists:
                        </span>
                        <span className="font-semibold">
                          {
                            processedAppointments.filter(
                              (apt) =>
                                staffMembers.find((s) => Number(s.id) === apt.staffId)
                                  ?.role === "hygienist"
                            ).length
                          }
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
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
        patients={patients}
        onDelete={handleDeleteAppointment}
      />

      <DeleteConfirmationDialog
        isOpen={confirmDeleteState.open}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteState({ open: false })}
        entityName={confirmDeleteState.appointmentTitle}
      />

      {/* Claim Services Modal */}
      {claimPatientId && claimAppointmentId && (
        <ClaimModal
          open={isClaimModalOpen}
          onClose={() => {
            setIsClaimModalOpen(false);
            setClaimPatientId(null);
            setClaimAppointmentId(null);
          }}
          patientId={claimPatientId}
          appointmentId={claimAppointmentId}
        />
      )}
    </div>
  );
}
