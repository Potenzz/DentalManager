import { z } from 'zod';
import { UserWhereUniqueInputObjectSchema } from './UserWhereUniqueInput.schema';
import { UserCreateWithoutPatientsInputObjectSchema } from './UserCreateWithoutPatientsInput.schema';
import { UserUncheckedCreateWithoutPatientsInputObjectSchema } from './UserUncheckedCreateWithoutPatientsInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.UserCreateOrConnectWithoutPatientsInput> = z
  .object({
    where: z.lazy(() => UserWhereUniqueInputObjectSchema),
    create: z.union([
      z.lazy(() => UserCreateWithoutPatientsInputObjectSchema),
      z.lazy(() => UserUncheckedCreateWithoutPatientsInputObjectSchema),
    ]),
  })
  .strict();

export const UserCreateOrConnectWithoutPatientsInputObjectSchema = Schema;
