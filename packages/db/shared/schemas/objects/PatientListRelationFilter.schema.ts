import { z } from 'zod';
import { PatientWhereInputObjectSchema } from './PatientWhereInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.PatientListRelationFilter> = z
  .object({
    every: z.lazy(() => PatientWhereInputObjectSchema).optional(),
    some: z.lazy(() => PatientWhereInputObjectSchema).optional(),
    none: z.lazy(() => PatientWhereInputObjectSchema).optional(),
  })
  .strict();

export const PatientListRelationFilterObjectSchema = Schema;
