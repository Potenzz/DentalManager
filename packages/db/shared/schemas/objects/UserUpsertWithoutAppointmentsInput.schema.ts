import { z } from 'zod';
import { UserUpdateWithoutAppointmentsInputObjectSchema } from './UserUpdateWithoutAppointmentsInput.schema';
import { UserUncheckedUpdateWithoutAppointmentsInputObjectSchema } from './UserUncheckedUpdateWithoutAppointmentsInput.schema';
import { UserCreateWithoutAppointmentsInputObjectSchema } from './UserCreateWithoutAppointmentsInput.schema';
import { UserUncheckedCreateWithoutAppointmentsInputObjectSchema } from './UserUncheckedCreateWithoutAppointmentsInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.UserUpsertWithoutAppointmentsInput> = z
  .object({
    update: z.union([
      z.lazy(() => UserUpdateWithoutAppointmentsInputObjectSchema),
      z.lazy(() => UserUncheckedUpdateWithoutAppointmentsInputObjectSchema),
    ]),
    create: z.union([
      z.lazy(() => UserCreateWithoutAppointmentsInputObjectSchema),
      z.lazy(() => UserUncheckedCreateWithoutAppointmentsInputObjectSchema),
    ]),
  })
  .strict();

export const UserUpsertWithoutAppointmentsInputObjectSchema = Schema;
