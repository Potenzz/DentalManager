import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Clock,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// import { Appointment, Patient } from "@repo/db/shared/schemas";
import {
  AppointmentUncheckedCreateInputObjectSchema,
  PatientUncheckedCreateInputObjectSchema,
} from "@repo/db/shared/schemas";

import { z } from "zod";
type Appointment = z.infer<typeof AppointmentUncheckedCreateInputObjectSchema>;

const PatientSchema = (
  PatientUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
).omit({
  appointments: true,
});
type Patient = z.infer<typeof PatientSchema>;

interface AppointmentTableProps {
  appointments: Appointment[];
  patients: Patient[];
  onEdit: (appointment: Appointment) => void;
  onDelete: (id: number) => void;
}

export function AppointmentTable({
  appointments,
  patients,
  onEdit,
  onDelete,
}: AppointmentTableProps) {
  // Helper function to get patient name
  const getPatientName = (patientId: number) => {
    const patient = patients.find((p) => p.id === patientId);
    return patient
      ? `${patient.firstName} ${patient.lastName}`
      : "Unknown Patient";
  };

  // Helper function to get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      {
        variant:
          | "default"
          | "secondary"
          | "destructive"
          | "outline"
          | "success";
        label: string;
      }
    > = {
      scheduled: { variant: "default", label: "Scheduled" },
      confirmed: { variant: "secondary", label: "Confirmed" },
      completed: { variant: "success", label: "Completed" },
      cancelled: { variant: "destructive", label: "Cancelled" },
      "no-show": { variant: "outline", label: "No Show" },
    };

    const config = statusConfig[status] || {
      variant: "default",
      label: status,
    };

    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  // Sort appointments by date and time (newest first)
  const sortedAppointments = [...appointments].sort((a, b) => {
    const dateComparison =
      new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateComparison !== 0) return dateComparison;
    return a.startTime.toString().localeCompare(b.startTime.toString());
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Patient</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedAppointments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No appointments found.
              </TableCell>
            </TableRow>
          ) : (
            sortedAppointments.map((appointment) => (
              <TableRow key={appointment.id}>
                <TableCell className="font-medium">
                  {getPatientName(appointment.patientId)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                    {format(new Date(appointment.date), "MMM d, yyyy")}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                    {appointment.startTime.slice(0, 5)} -{" "}
                    {appointment.endTime.slice(0, 5)}
                  </div>
                </TableCell>
                <TableCell className="capitalize">
                  {appointment.type.replace("-", " ")}
                </TableCell>
                <TableCell>{getStatusBadge(appointment.status!)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onEdit(appointment)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          if (typeof appointment.id === "number") {
                            onDelete(appointment.id);
                          } else {
                            console.error("Invalid appointment ID");
                          }
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
