import { z } from 'zod';
import { IntFilterObjectSchema } from './IntFilter.schema';
import { StringFilterObjectSchema } from './StringFilter.schema';
import { PatientListRelationFilterObjectSchema } from './PatientListRelationFilter.schema';
import { AppointmentListRelationFilterObjectSchema } from './AppointmentListRelationFilter.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.UserWhereInput> = z
  .object({
    AND: z
      .union([
        z.lazy(() => UserWhereInputObjectSchema),
        z.lazy(() => UserWhereInputObjectSchema).array(),
      ])
      .optional(),
    OR: z
      .lazy(() => UserWhereInputObjectSchema)
      .array()
      .optional(),
    NOT: z
      .union([
        z.lazy(() => UserWhereInputObjectSchema),
        z.lazy(() => UserWhereInputObjectSchema).array(),
      ])
      .optional(),
    id: z.union([z.lazy(() => IntFilterObjectSchema), z.number()]).optional(),
    username: z
      .union([z.lazy(() => StringFilterObjectSchema), z.string()])
      .optional(),
    password: z
      .union([z.lazy(() => StringFilterObjectSchema), z.string()])
      .optional(),
    patients: z.lazy(() => PatientListRelationFilterObjectSchema).optional(),
    appointments: z
      .lazy(() => AppointmentListRelationFilterObjectSchema)
      .optional(),
  })
  .strict();

export const UserWhereInputObjectSchema = Schema;
