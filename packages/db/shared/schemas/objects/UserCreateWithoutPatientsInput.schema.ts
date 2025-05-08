import { z } from 'zod';
import { AppointmentCreateNestedManyWithoutUserInputObjectSchema } from './AppointmentCreateNestedManyWithoutUserInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.UserCreateWithoutPatientsInput> = z
  .object({
    username: z.string(),
    password: z.string(),
    appointments: z
      .lazy(() => AppointmentCreateNestedManyWithoutUserInputObjectSchema)
      .optional(),
  })
  .strict();

export const UserCreateWithoutPatientsInputObjectSchema = Schema;
