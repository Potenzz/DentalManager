import { z } from 'zod';
import { UserCreateWithoutAppointmentsInputObjectSchema } from './UserCreateWithoutAppointmentsInput.schema';
import { UserUncheckedCreateWithoutAppointmentsInputObjectSchema } from './UserUncheckedCreateWithoutAppointmentsInput.schema';
import { UserCreateOrConnectWithoutAppointmentsInputObjectSchema } from './UserCreateOrConnectWithoutAppointmentsInput.schema';
import { UserWhereUniqueInputObjectSchema } from './UserWhereUniqueInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.UserCreateNestedOneWithoutAppointmentsInput> = z
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
    connect: z.lazy(() => UserWhereUniqueInputObjectSchema).optional(),
  })
  .strict();

export const UserCreateNestedOneWithoutAppointmentsInputObjectSchema = Schema;
