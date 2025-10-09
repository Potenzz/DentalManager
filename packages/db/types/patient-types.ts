import { PatientUncheckedCreateInputObjectSchema } from "@repo/db/usedSchemas";
import { z } from "zod";

export type Patient = z.infer<typeof PatientUncheckedCreateInputObjectSchema>;

export const insuranceIdSchema = z.preprocess(
  (val) => {
    if (val === undefined || val === null) return undefined;

    // Accept numbers and strings
    if (typeof val === "number") {
      return String(val).replace(/\s+/g, "");
    }
    if (typeof val === "string") {
      const cleaned = val.replace(/\s+/g, "");
      if (cleaned === "") return undefined;
      return cleaned;
    }
    return val;
  },
  // After preprocess, require digits-only string (or optional nullable)
  z
    .string()
    .regex(/^\d+$/, { message: "Insurance ID must contain only digits" })
    .min(1)
    .max(32)
    .optional()
    .nullable()
);

export const insertPatientSchema = (
  PatientUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
)
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    insuranceId: insuranceIdSchema, // enforce numeric insuranceId
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
  .partial()
  .extend({
    insuranceId: insuranceIdSchema, // enforce numeric insuranceId
  });

export type UpdatePatient = z.infer<typeof updatePatientSchema>;

export type FinancialRow = {
  type: "CLAIM" | "PAYMENT";
  id: number;
  date: string | null;
  createdAt: string | null;
  status: string | null;
  total_billed: number;
  total_paid: number;
  total_adjusted: number;
  total_due: number;
  patient_name: string | null;
  service_lines: any[];
  linked_payment_id?: number | null;
};
