import { CommunicationUncheckedCreateInputObjectSchema } from "@repo/db/usedSchemas";
import { z } from "zod";

/**
 * Full Communication type (Prisma unchecked create input)
 */
export type Communication = z.infer<
  typeof CommunicationUncheckedCreateInputObjectSchema
>;

/**
 * Insert Communication
 * - excludes auto-generated fields
 */
export const insertCommunicationSchema = (
  CommunicationUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
).omit({
  id: true,
  createdAt: true,
});

export type InsertCommunication = z.infer<
  typeof insertCommunicationSchema
>;

/**
 * Update Communication
 * - excludes immutable fields
 * - makes everything optional
 */
export const updateCommunicationSchema = (
  CommunicationUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
)
  .omit({
    id: true,
    createdAt: true,
  })
  .partial();

export type UpdateCommunication = z.infer<
  typeof updateCommunicationSchema
>;
