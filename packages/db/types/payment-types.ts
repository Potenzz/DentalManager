import {
  PaymentUncheckedCreateInputObjectSchema,
  PaymentTransactionCreateInputObjectSchema,
  ServiceLinePaymentCreateInputObjectSchema,
  ClaimUncheckedCreateInputObjectSchema,
  ClaimStatusSchema,
  StaffUncheckedCreateInputObjectSchema,
  PaymentMethodSchema,
  PaymentStatusSchema
} from "@repo/db/usedSchemas";
import { Prisma } from "@repo/db/generated/prisma";
import { z } from "zod";
import { Decimal } from "decimal.js";

// ========== BASIC TYPES ==========

// Payment basic type from Zod
export type Payment = z.infer<typeof PaymentUncheckedCreateInputObjectSchema>;

// Zod input type for creating a transaction
export type PaymentTransactionInput = z.infer<
  typeof PaymentTransactionCreateInputObjectSchema
>;

// Prisma output type for single transaction (fetched with includes)
export type PaymentTransactionRecord = Prisma.PaymentTransactionGetPayload<{
  include: {
    serviceLinePayments: {
      include: { serviceLine: true };
    };
  };
}>;

// Type for ServiceLinePayment input (used for updates/creates)
export type ServiceLinePayment = z.infer<
  typeof ServiceLinePaymentCreateInputObjectSchema
>;

// Enum for payment 
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>

// ✅ Runtime arrays (used in code logic / map / select options)
export const paymentStatusOptions = PaymentStatusSchema.options;
export const paymentMethodOptions = PaymentMethodSchema.options;


// ========== INPUT TYPES ==========

// Used to update individual service line payment
export type PartialServicePaymentInput = {
  id: number;
  paidAmount: Decimal;
  adjustedAmount: Decimal;
  notes: string | null;
};

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

// Input for updating a payment with new transactions + updated service payments
export type UpdatePaymentInput = {
  newTransactions: PaymentTransactionInput[];
  servicePayments: PartialServicePaymentInput[];
  totalPaid: Decimal;
  totalDue: Decimal;
  status: PaymentStatus;
};

// ========== EXTENDED TYPES ==========

// Payment with full nested data
export type PaymentWithExtras = Prisma.PaymentGetPayload<{
  include: {
    claim: {
      include: {
        serviceLines: true;
      };
    };
    transactions: {
      include: {
        serviceLinePayments: {
          include: {
            serviceLine: true;
          };
        };
      };
    };
    updatedBy: true;
  };
}> & {
  patientName: string;
  paymentDate: Date;
  paymentMethod: string;
};

// Claim model with embedded service lines
export type Claim = z.infer<typeof ClaimUncheckedCreateInputObjectSchema>;
export type ClaimStatus = z.infer<typeof ClaimStatusSchema>;

export type Staff = z.infer<typeof StaffUncheckedCreateInputObjectSchema>;

export type ClaimWithServiceLines = Claim & {
  serviceLines: {
    id: number;
    claimId: number;
    procedureCode: string;
    procedureDate: Date;
    oralCavityArea: string | null;
    toothNumber: string | null;
    toothSurface: string | null;
    billedAmount: number;
    status: string;
  }[];
  staff: Staff | null;
};

export type NewTransactionPayload = {
  paymentId: number;
  amount: number;
  method: PaymentMethod;
  payerName?: string;
  notes?: string;
  receivedDate: Date;
  serviceLinePayments: {
    serviceLineId: number;
    paidAmount: number;
    adjustedAmount: number;
    notes?: string;
  }[];
};
