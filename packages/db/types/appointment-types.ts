import { AppointmentUncheckedCreateInputObjectSchema } from "@repo/db/usedSchemas";
import {z} from "zod";

export type Appointment = z.infer<typeof AppointmentUncheckedCreateInputObjectSchema>;

export const insertAppointmentSchema = (
  AppointmentUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
).omit({
  id: true,
  createdAt: true,
});
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export const updateAppointmentSchema = (
  AppointmentUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
)
  .omit({
    id: true,
    createdAt: true,
  })
  .partial();
export type UpdateAppointment = z.infer<typeof updateAppointmentSchema>;