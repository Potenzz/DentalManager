import { z } from 'zod';
import { PatientCreateNestedManyWithoutUserInputObjectSchema } from './PatientCreateNestedManyWithoutUserInput.schema';
import { AppointmentCreateNestedManyWithoutUserInputObjectSchema } from './AppointmentCreateNestedManyWithoutUserInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.UserCreateInput> = z
  .object({
    username: z.string(),
    password: z.string(),
    patients: z
      .lazy(() => PatientCreateNestedManyWithoutUserInputObjectSchema)
      .optional(),
    appointments: z
      .lazy(() => AppointmentCreateNestedManyWithoutUserInputObjectSchema)
      .optional(),
  })
  .strict();

export const UserCreateInputObjectSchema = Schema;
