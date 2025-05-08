import { z } from 'zod';
import { PatientCreateManyUserInputObjectSchema } from './PatientCreateManyUserInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.PatientCreateManyUserInputEnvelope> = z
  .object({
    data: z.union([
      z.lazy(() => PatientCreateManyUserInputObjectSchema),
      z.lazy(() => PatientCreateManyUserInputObjectSchema).array(),
    ]),
    skipDuplicates: z.boolean().optional(),
  })
  .strict();

export const PatientCreateManyUserInputEnvelopeObjectSchema = Schema;
