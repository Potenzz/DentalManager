import { DatabaseBackupUncheckedCreateInputObjectSchema } from "@repo/db/usedSchemas";
import { z } from "zod";

export type DatabaseBackup = z.infer<
  typeof DatabaseBackupUncheckedCreateInputObjectSchema
>;
