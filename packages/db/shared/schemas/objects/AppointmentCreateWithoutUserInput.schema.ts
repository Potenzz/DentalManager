import { z } from 'zod';
import { PatientCreateNestedOneWithoutAppointmentsInputObjectSchema } from './PatientCreateNestedOneWithoutAppointmentsInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.AppointmentCreateWithoutUserInput> = z
  .object({
    title: z.string(),
    date: z.coerce.date(),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    type: z.string(),
    notes: z.string().optional().nullable(),
    status: z.string().optional(),
    createdAt: z.coerce.date().optional(),
    patient: z.lazy(
      () => PatientCreateNestedOneWithoutAppointmentsInputObjectSchema,
    ),
  })
  .strict();

export const AppointmentCreateWithoutUserInputObjectSchema = Schema;
