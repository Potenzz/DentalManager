import { z } from 'zod';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.AppointmentSumAggregateInputType> = z
  .object({
    id: z.literal(true).optional(),
    patientId: z.literal(true).optional(),
    userId: z.literal(true).optional(),
  })
  .strict();

export const AppointmentSumAggregateInputObjectSchema = Schema;
