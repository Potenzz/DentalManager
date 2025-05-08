import { z } from 'zod';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.StringFieldUpdateOperationsInput> = z
  .object({
    set: z.string().optional(),
  })
  .strict();

export const StringFieldUpdateOperationsInputObjectSchema = Schema;
