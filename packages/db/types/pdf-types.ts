import { PdfFileUncheckedCreateInputObjectSchema, PdfGroupUncheckedCreateInputObjectSchema } from "@repo/db/usedSchemas";
import {z} from "zod";

export type PdfGroup = z.infer<typeof PdfGroupUncheckedCreateInputObjectSchema>;
export type PdfFile = z.infer<typeof PdfFileUncheckedCreateInputObjectSchema>;

export interface ClaimPdfMetadata {
  id: number;
  filename: string;
  uploadedAt: Date;
}