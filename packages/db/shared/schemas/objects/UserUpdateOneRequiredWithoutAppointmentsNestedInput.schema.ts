import { z } from 'zod';
import { UserCreateWithoutAppointmentsInputObjectSchema } from './UserCreateWithoutAppointmentsInput.schema';
import { UserUncheckedCreateWithoutAppointmentsInputObjectSchema } from './UserUncheckedCreateWithoutAppointmentsInput.schema';
import { UserCreateOrConnectWithoutAppointmentsInputObjectSchema } from './UserCreateOrConnectWithoutAppointmentsInput.schema';
import { UserUpsertWithoutAppointmentsInputObjectSchema } from './UserUpsertWithoutAppointmentsInput.schema';
import { UserWhereUniqueInputObjectSchema } from './UserWhereUniqueInput.schema';
import { UserUpdateWithoutAppointmentsInputObjectSchema } from './UserUpdateWithoutAppointmentsInput.schema';
import { UserUncheckedUpdateWithoutAppointmentsInputObjectSchema } from './UserUncheckedUpdateWithoutAppointmentsInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.UserUpdateOneRequiredWithoutAppointmentsNestedInput> =
  z
    .object({
      create: z
        .union([
          z.lazy(() => UserCreateWithoutAppointmentsInputObjectSchema),
          z.lazy(() => UserUncheckedCreateWithoutAppointmentsInputObjectSchema),
        ])
        .optional(),
      connectOrCreate: z
        .lazy(() => UserCreateOrConnectWithoutAppointmentsInputObjectSchema)
        .optional(),
      upsert: z
        .lazy(() => UserUpsertWithoutAppointmentsInputObjectSchema)
        .optional(),
      connect: z.lazy(() => UserWhereUniqueInputObjectSchema).optional(),
      update: z
        .union([
          z.lazy(() => UserUpdateWithoutAppointmentsInputObjectSchema),
          z.lazy(() => UserUncheckedUpdateWithoutAppointmentsInputObjectSchema),
        ])
        .optional(),
    })
    .strict();

export const UserUpdateOneRequiredWithoutAppointmentsNestedInputObjectSchema =
  Schema;
