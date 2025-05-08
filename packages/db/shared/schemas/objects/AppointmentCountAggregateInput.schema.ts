import { z } from 'zod';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.AppointmentCountAggregateInputType> = z
  .object({
    id: z.literal(true).optional(),
    patientId: z.literal(true).optional(),
    userId: z.literal(true).optional(),
    title: z.literal(true).optional(),
    date: z.literal(true).optional(),
    startTime: z.literal(true).optional(),
    endTime: z.literal(true).optional(),
    type: z.literal(true).optional(),
    notes: z.literal(true).optional(),
    status: z.literal(true).optional(),
    createdAt: z.literal(true).optional(),
    _all: z.literal(true).optional(),
  })
  .strict();

export const AppointmentCountAggregateInputObjectSchema = Schema;
