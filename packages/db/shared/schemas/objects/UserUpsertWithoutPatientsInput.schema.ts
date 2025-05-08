import { z } from 'zod';
import { UserUpdateWithoutPatientsInputObjectSchema } from './UserUpdateWithoutPatientsInput.schema';
import { UserUncheckedUpdateWithoutPatientsInputObjectSchema } from './UserUncheckedUpdateWithoutPatientsInput.schema';
import { UserCreateWithoutPatientsInputObjectSchema } from './UserCreateWithoutPatientsInput.schema';
import { UserUncheckedCreateWithoutPatientsInputObjectSchema } from './UserUncheckedCreateWithoutPatientsInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.UserUpsertWithoutPatientsInput> = z
  .object({
    update: z.union([
      z.lazy(() => UserUpdateWithoutPatientsInputObjectSchema),
      z.lazy(() => UserUncheckedUpdateWithoutPatientsInputObjectSchema),
    ]),
    create: z.union([
      z.lazy(() => UserCreateWithoutPatientsInputObjectSchema),
      z.lazy(() => UserUncheckedCreateWithoutPatientsInputObjectSchema),
    ]),
  })
  .strict();

export const UserUpsertWithoutPatientsInputObjectSchema = Schema;
