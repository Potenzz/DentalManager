import { z } from 'zod';
import { AppointmentWhereUniqueInputObjectSchema } from './AppointmentWhereUniqueInput.schema';
import { AppointmentUpdateWithoutUserInputObjectSchema } from './AppointmentUpdateWithoutUserInput.schema';
import { AppointmentUncheckedUpdateWithoutUserInputObjectSchema } from './AppointmentUncheckedUpdateWithoutUserInput.schema';
import { AppointmentCreateWithoutUserInputObjectSchema } from './AppointmentCreateWithoutUserInput.schema';
import { AppointmentUncheckedCreateWithoutUserInputObjectSchema } from './AppointmentUncheckedCreateWithoutUserInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.AppointmentUpsertWithWhereUniqueWithoutUserInput> =
  z
    .object({
      where: z.lazy(() => AppointmentWhereUniqueInputObjectSchema),
      update: z.union([
        z.lazy(() => AppointmentUpdateWithoutUserInputObjectSchema),
        z.lazy(() => AppointmentUncheckedUpdateWithoutUserInputObjectSchema),
      ]),
      create: z.union([
        z.lazy(() => AppointmentCreateWithoutUserInputObjectSchema),
        z.lazy(() => AppointmentUncheckedCreateWithoutUserInputObjectSchema),
      ]),
    })
    .strict();

export const AppointmentUpsertWithWhereUniqueWithoutUserInputObjectSchema =
  Schema;
