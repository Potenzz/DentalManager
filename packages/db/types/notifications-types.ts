import {
  NotificationTypesSchema,
  NotificationUncheckedCreateInputObjectSchema,
} from "@repo/db/usedSchemas";
import { z } from "zod";

export type Notification = z.infer<
  typeof NotificationUncheckedCreateInputObjectSchema
>;

export type NotificationTypes = z.infer<typeof NotificationTypesSchema>;
