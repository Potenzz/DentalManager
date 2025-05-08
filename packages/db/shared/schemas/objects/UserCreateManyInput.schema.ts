import { z } from 'zod';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.UserCreateManyInput> = z
  .object({
    id: z.number().optional(),
    username: z.string(),
    password: z.string(),
  })
  .strict();

export const UserCreateManyInputObjectSchema = Schema;
