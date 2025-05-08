import { z } from 'zod';
import { UserCreateWithoutPatientsInputObjectSchema } from './UserCreateWithoutPatientsInput.schema';
import { UserUncheckedCreateWithoutPatientsInputObjectSchema } from './UserUncheckedCreateWithoutPatientsInput.schema';
import { UserCreateOrConnectWithoutPatientsInputObjectSchema } from './UserCreateOrConnectWithoutPatientsInput.schema';
import { UserUpsertWithoutPatientsInputObjectSchema } from './UserUpsertWithoutPatientsInput.schema';
import { UserWhereUniqueInputObjectSchema } from './UserWhereUniqueInput.schema';
import { UserUpdateWithoutPatientsInputObjectSchema } from './UserUpdateWithoutPatientsInput.schema';
import { UserUncheckedUpdateWithoutPatientsInputObjectSchema } from './UserUncheckedUpdateWithoutPatientsInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.UserUpdateOneRequiredWithoutPatientsNestedInput> =
  z
    .object({
      create: z
        .union([
          z.lazy(() => UserCreateWithoutPatientsInputObjectSchema),
          z.lazy(() => UserUncheckedCreateWithoutPatientsInputObjectSchema),
        ])
        .optional(),
      connectOrCreate: z
        .lazy(() => UserCreateOrConnectWithoutPatientsInputObjectSchema)
        .optional(),
      upsert: z
        .lazy(() => UserUpsertWithoutPatientsInputObjectSchema)
        .optional(),
      connect: z.lazy(() => UserWhereUniqueInputObjectSchema).optional(),
      update: z
        .union([
          z.lazy(() => UserUpdateWithoutPatientsInputObjectSchema),
          z.lazy(() => UserUncheckedUpdateWithoutPatientsInputObjectSchema),
        ])
        .optional(),
    })
    .strict();

export const UserUpdateOneRequiredWithoutPatientsNestedInputObjectSchema =
  Schema;
