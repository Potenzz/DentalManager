import { z } from 'zod';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.UserMinAggregateInputType> = z
  .object({
    id: z.literal(true).optional(),
    username: z.literal(true).optional(),
    password: z.literal(true).optional(),
  })
  .strict();

export const UserMinAggregateInputObjectSchema = Schema;
