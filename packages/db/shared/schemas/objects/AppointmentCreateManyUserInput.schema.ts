import { z } from 'zod';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.AppointmentCreateManyUserInput> = z
  .object({
    id: z.number().optional(),
    patientId: z.number(),
    title: z.string(),
    date: z.coerce.date(),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    type: z.string(),
    notes: z.string().optional().nullable(),
    status: z.string().optional(),
    createdAt: z.coerce.date().optional(),
  })
  .strict();

export const AppointmentCreateManyUserInputObjectSchema = Schema;
