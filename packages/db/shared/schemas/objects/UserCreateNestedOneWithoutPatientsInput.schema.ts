import { z } from 'zod';
import { UserCreateWithoutPatientsInputObjectSchema } from './UserCreateWithoutPatientsInput.schema';
import { UserUncheckedCreateWithoutPatientsInputObjectSchema } from './UserUncheckedCreateWithoutPatientsInput.schema';
import { UserCreateOrConnectWithoutPatientsInputObjectSchema } from './UserCreateOrConnectWithoutPatientsInput.schema';
import { UserWhereUniqueInputObjectSchema } from './UserWhereUniqueInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.UserCreateNestedOneWithoutPatientsInput> = z
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
    connect: z.lazy(() => UserWhereUniqueInputObjectSchema).optional(),
  })
  .strict();

export const UserCreateNestedOneWithoutPatientsInputObjectSchema = Schema;
