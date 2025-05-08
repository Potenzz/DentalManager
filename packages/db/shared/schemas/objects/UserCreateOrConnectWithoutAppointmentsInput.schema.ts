import { z } from 'zod';
import { UserWhereUniqueInputObjectSchema } from './UserWhereUniqueInput.schema';
import { UserCreateWithoutAppointmentsInputObjectSchema } from './UserCreateWithoutAppointmentsInput.schema';
import { UserUncheckedCreateWithoutAppointmentsInputObjectSchema } from './UserUncheckedCreateWithoutAppointmentsInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.UserCreateOrConnectWithoutAppointmentsInput> = z
  .object({
    where: z.lazy(() => UserWhereUniqueInputObjectSchema),
    create: z.union([
      z.lazy(() => UserCreateWithoutAppointmentsInputObjectSchema),
      z.lazy(() => UserUncheckedCreateWithoutAppointmentsInputObjectSchema),
    ]),
  })
  .strict();

export const UserCreateOrConnectWithoutAppointmentsInputObjectSchema = Schema;
