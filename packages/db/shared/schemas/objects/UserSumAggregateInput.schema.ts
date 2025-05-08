import { z } from 'zod';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.UserSumAggregateInputType> = z
  .object({
    id: z.literal(true).optional(),
  })
  .strict();

export const UserSumAggregateInputObjectSchema = Schema;
