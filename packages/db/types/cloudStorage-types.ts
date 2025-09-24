import { CloudFolderUncheckedCreateInputObjectSchema, CloudFileUncheckedCreateInputObjectSchema } from "@repo/db/usedSchemas";
import {z} from "zod";

export type CloudFolder = z.infer<typeof  CloudFolderUncheckedCreateInputObjectSchema>;
export type CloudFile = z.infer<typeof CloudFileUncheckedCreateInputObjectSchema>;


