import { z } from 'zod';
import { AppointmentCreateManyUserInputObjectSchema } from './AppointmentCreateManyUserInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.AppointmentCreateManyUserInputEnvelope> = z
  .object({
    data: z.union([
      z.lazy(() => AppointmentCreateManyUserInputObjectSchema),
      z.lazy(() => AppointmentCreateManyUserInputObjectSchema).array(),
    ]),
    skipDuplicates: z.boolean().optional(),
  })
  .strict();

export const AppointmentCreateManyUserInputEnvelopeObjectSchema = Schema;
