import {
  ClaimStatusSchema,
  ClaimUncheckedCreateInputObjectSchema,
} from "@repo/db/usedSchemas";
import { z } from "zod";
import { Decimal } from "decimal.js";
import { Staff } from "@repo/db/types";

export const insertClaimSchema = (
  ClaimUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertClaim = z.infer<typeof insertClaimSchema>;

export const updateClaimSchema = (
  ClaimUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .partial();

export type UpdateClaim = z.infer<typeof updateClaimSchema>;

// Extend the schema to inject `userId` manually (since it's not passed by the client)
export const ExtendedClaimSchema = (
  ClaimUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
).extend({
  userId: z.number(),
});

export type Claim = z.infer<typeof ClaimUncheckedCreateInputObjectSchema>;
export type ClaimStatus = z.infer<typeof ClaimStatusSchema>;

export type ClaimFileMeta = {
  id?: number;
  filename: string;
  mimeType?: string | null;
};

//used in claim-form
export interface InputServiceLine {
  procedureCode: string;
  procedureDate: string; // YYYY-MM-DD
  oralCavityArea?: string;
  toothNumber?: string;
  toothSurface?: string;
  totalBilled: Decimal;
  totalPaid?: Decimal;
  totalAdjusted?: Decimal;
}

// Claim model with embedded service lines
export type ClaimWithServiceLines = Claim & {
  serviceLines: {
    id: number;
    claimId: number | null;
    procedureCode: string;
    procedureDate: Date;
    oralCavityArea: string | null;
    toothNumber: string | null;
    toothSurface: string | null;
    totalBilled: Decimal;
    totalPaid: Decimal;
    totalAdjusted: Decimal;
    status: string;
  }[];
  staff?: Staff | null;
  claimFiles?: ClaimFileMeta[] | null;
};
