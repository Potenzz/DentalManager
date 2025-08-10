import { StaffUncheckedCreateInputObjectSchema } from "@repo/db/usedSchemas";
import {z} from "zod";

export type Staff = z.infer<typeof StaffUncheckedCreateInputObjectSchema>;
