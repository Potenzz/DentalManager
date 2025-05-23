import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppointmentForm } from "./appointment-form";
import { AppointmentUncheckedCreateInputObjectSchema, PatientUncheckedCreateInputObjectSchema } from "@repo/db/usedSchemas";

import {z} from "zod";
type Appointment = z.infer<typeof AppointmentUncheckedCreateInputObjectSchema>;

const insertAppointmentSchema = (AppointmentUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>).omit({
  id: true,
  createdAt: true,
});
type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

const updateAppointmentSchema = (AppointmentUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>).omit({
  id: true,
  createdAt: true,
}).partial();
type UpdateAppointment = z.infer<typeof updateAppointmentSchema>;

const PatientSchema = (PatientUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>).omit({
  appointments: true,
});
type Patient = z.infer<typeof PatientSchema>;

interface AddAppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: InsertAppointment | UpdateAppointment) => void;
  onDelete?: (id: number) => void; 
  isLoading: boolean;
  appointment?: Appointment;
  patients: Patient[];
}

export function AddAppointmentModal({
  open,
  onOpenChange,
  onSubmit,
  onDelete,
  isLoading,
  appointment,
  patients,
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
            patients={patients}
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