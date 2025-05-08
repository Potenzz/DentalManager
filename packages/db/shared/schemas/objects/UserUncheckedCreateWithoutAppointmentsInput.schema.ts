import { z } from 'zod';
import { PatientUncheckedCreateNestedManyWithoutUserInputObjectSchema } from './PatientUncheckedCreateNestedManyWithoutUserInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.UserUncheckedCreateWithoutAppointmentsInput> = z
  .object({
    id: z.number().optional(),
    username: z.string(),
    password: z.string(),
    patients: z
      .lazy(() => PatientUncheckedCreateNestedManyWithoutUserInputObjectSchema)
      .optional(),
  })
  .strict();

export const UserUncheckedCreateWithoutAppointmentsInputObjectSchema = Schema;
