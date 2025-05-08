import { z } from 'zod';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.UserWhereUniqueInput> = z
  .object({
    id: z.number().optional(),
    username: z.string().optional(),
  })
  .strict();

export const UserWhereUniqueInputObjectSchema = Schema;
