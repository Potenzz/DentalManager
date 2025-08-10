import { InsuranceCredentialUncheckedCreateInputObjectSchema } from "@repo/db/usedSchemas";
import {z} from "zod";

export type InsuranceCredential = z.infer<
  typeof InsuranceCredentialUncheckedCreateInputObjectSchema
>;

export const insertInsuranceCredentialSchema = (
  InsuranceCredentialUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
).omit({ id: true });

export type InsertInsuranceCredential = z.infer<
  typeof insertInsuranceCredentialSchema
>;
