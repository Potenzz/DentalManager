import { z } from 'zod';
import { AppointmentUncheckedCreateNestedManyWithoutUserInputObjectSchema } from './AppointmentUncheckedCreateNestedManyWithoutUserInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.UserUncheckedCreateWithoutPatientsInput> = z
  .object({
    id: z.number().optional(),
    username: z.string(),
    password: z.string(),
    appointments: z
      .lazy(
        () => AppointmentUncheckedCreateNestedManyWithoutUserInputObjectSchema,
      )
      .optional(),
  })
  .strict();

export const UserUncheckedCreateWithoutPatientsInputObjectSchema = Schema;
