import { z } from 'zod';
import { PatientUncheckedCreateNestedManyWithoutUserInputObjectSchema } from './PatientUncheckedCreateNestedManyWithoutUserInput.schema';
import { AppointmentUncheckedCreateNestedManyWithoutUserInputObjectSchema } from './AppointmentUncheckedCreateNestedManyWithoutUserInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.UserUncheckedCreateInput> = z
  .object({
    id: z.number().optional(),
    username: z.string(),
    password: z.string(),
    patients: z
      .lazy(() => PatientUncheckedCreateNestedManyWithoutUserInputObjectSchema)
      .optional(),
    appointments: z
      .lazy(
        () => AppointmentUncheckedCreateNestedManyWithoutUserInputObjectSchema,
      )
      .optional(),
  })
  .strict();

export const UserUncheckedCreateInputObjectSchema = Schema;
