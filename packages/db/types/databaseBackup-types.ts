import { DatabaseBackupUncheckedCreateInputObjectSchema, BackupDestinationUncheckedCreateInputObjectSchema } from "@repo/db/usedSchemas";
import { z } from "zod";

export type DatabaseBackup = z.infer<
  typeof DatabaseBackupUncheckedCreateInputObjectSchema
>;

export type BackupDestination = z.infer<
  typeof BackupDestinationUncheckedCreateInputObjectSchema
>;
