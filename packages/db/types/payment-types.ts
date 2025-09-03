import {
  PaymentUncheckedCreateInputObjectSchema,
  ServiceLineTransactionCreateInputObjectSchema,
  PaymentMethodSchema,
  PaymentStatusSchema,
} from "@repo/db/usedSchemas";
import { Prisma } from "@repo/db/generated/prisma";
import { z } from "zod";

// ========== BASIC TYPES ==========

// Payment basic type from Zod
export type Payment = z.infer<typeof PaymentUncheckedCreateInputObjectSchema>;

// Zod input type for creating a transaction
export type ServiceLineTransactionInput = z.infer<
  typeof ServiceLineTransactionCreateInputObjectSchema
>;

// Prisma output type for single transaction (fetched with includes)
export type ServiceLineTransactionRecord =
  Prisma.ServiceLineTransactionGetPayload<{
    include: {
      serviceLine: true;
    };
  }>;

// Enum for payment
export { PaymentStatusSchema };
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

// ✅ Runtime arrays (used in code logic / map / select options)
export const paymentStatusOptions = PaymentStatusSchema.options;
export const paymentMethodOptions = PaymentMethodSchema.options;

// ========== INPUT TYPES ==========

// For creating a new payment
export const insertPaymentSchema = (
  PaymentUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

// For updating an existing payment (partial updates)
export const updatePaymentSchema = (
  PaymentUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
)
  .omit({
    id: true,
    createdAt: true,
  })
  .partial();
export type UpdatePayment = z.infer<typeof updatePaymentSchema>;

// ========== EXTENDED TYPES ==========

// Payment with full nested data
export type PaymentWithExtras = Prisma.PaymentGetPayload<{
  include: {
    claim: {
      include: {
        serviceLines: true;
      };
    };
    serviceLines: true; // ✅ OCR-only service lines directly under Payment
    serviceLineTransactions: {
      include: {
        serviceLine: true;
      };
    };
    updatedBy: true;
    patient: true; 
  };
}> & {
  patientName: string;
  paymentDate: Date;
  paymentMethod: string;
};

export const newTransactionPayloadSchema = z.object({
  paymentId: z.number(),
  serviceLineTransactions: z.array(
    z.object({
      serviceLineId: z.number(),
      transactionId: z.string().optional(),
      paidAmount: z.number(),
      adjustedAmount: z.number().optional(),
      method: PaymentMethodSchema,
      receivedDate: z.coerce.date(),
      payerName: z.string().optional(),
      notes: z.string().optional(),
    })
  ),
});

export type NewTransactionPayload = z.infer<typeof newTransactionPayloadSchema>;
