import { PatientUncheckedCreateInputObjectSchema } from "@repo/db/usedSchemas";
import {z} from "zod";

export type Patient = z.infer<typeof PatientUncheckedCreateInputObjectSchema>;

export const insertPatientSchema = (
  PatientUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
).omit({
  id: true,
  createdAt: true,
});
export type InsertPatient = z.infer<typeof insertPatientSchema>;

export const updatePatientSchema = (
  PatientUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
)
  .omit({
    id: true,
    createdAt: true,
    userId: true,
  })
  .partial();

export type UpdatePatient = z.infer<typeof updatePatientSchema>;