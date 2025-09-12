import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppointmentForm } from "./appointment-form";
import {
  Appointment,
  InsertAppointment,
  UpdateAppointment,
} from "@repo/db/types";

interface AddAppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: InsertAppointment | UpdateAppointment) => void;
  onDelete?: (id: number) => void;
  isLoading: boolean;
  appointment?: Appointment;
}

export function AddAppointmentModal({
  open,
  onOpenChange,
  onSubmit,
  onDelete,
  isLoading,
  appointment,
}: AddAppointmentModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {appointment ? "Edit Appointment" : "Add New Appointment"}
          </DialogTitle>
        </DialogHeader>
        <div className="p-1">
          <AppointmentForm
            appointment={appointment}
            onSubmit={(data) => {
              onSubmit(data);
              onOpenChange(false);
            }}
            isLoading={isLoading}
            onDelete={onDelete}
            onOpenChange={onOpenChange}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
