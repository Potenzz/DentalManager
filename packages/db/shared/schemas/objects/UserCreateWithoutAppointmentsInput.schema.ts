import { z } from 'zod';
import { PatientCreateNestedManyWithoutUserInputObjectSchema } from './PatientCreateNestedManyWithoutUserInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.UserCreateWithoutAppointmentsInput> = z
  .object({
    username: z.string(),
    password: z.string(),
    patients: z
      .lazy(() => PatientCreateNestedManyWithoutUserInputObjectSchema)
      .optional(),
  })
  .strict();

export const UserCreateWithoutAppointmentsInputObjectSchema = Schema;
