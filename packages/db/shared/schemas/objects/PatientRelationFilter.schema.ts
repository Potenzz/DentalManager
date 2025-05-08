import { z } from 'zod';
import { PatientWhereInputObjectSchema } from './PatientWhereInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.PatientRelationFilter> = z
  .object({
    is: z
      .lazy(() => PatientWhereInputObjectSchema)
      .optional()
      .nullable(),
    isNot: z
      .lazy(() => PatientWhereInputObjectSchema)
      .optional()
      .nullable(),
  })
  .strict();

export const PatientRelationFilterObjectSchema = Schema;
