import { z } from 'zod';
import { AppointmentCreateManyPatientInputObjectSchema } from './AppointmentCreateManyPatientInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.AppointmentCreateManyPatientInputEnvelope> = z
  .object({
    data: z.union([
      z.lazy(() => AppointmentCreateManyPatientInputObjectSchema),
      z.lazy(() => AppointmentCreateManyPatientInputObjectSchema).array(),
    ]),
    skipDuplicates: z.boolean().optional(),
  })
  .strict();

export const AppointmentCreateManyPatientInputEnvelopeObjectSchema = Schema;
