import { z } from 'zod';
import { AppointmentWhereUniqueInputObjectSchema } from './AppointmentWhereUniqueInput.schema';
import { AppointmentUpdateWithoutUserInputObjectSchema } from './AppointmentUpdateWithoutUserInput.schema';
import { AppointmentUncheckedUpdateWithoutUserInputObjectSchema } from './AppointmentUncheckedUpdateWithoutUserInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.AppointmentUpdateWithWhereUniqueWithoutUserInput> =
  z
    .object({
      where: z.lazy(() => AppointmentWhereUniqueInputObjectSchema),
      data: z.union([
        z.lazy(() => AppointmentUpdateWithoutUserInputObjectSchema),
        z.lazy(() => AppointmentUncheckedUpdateWithoutUserInputObjectSchema),
      ]),
    })
    .strict();

export const AppointmentUpdateWithWhereUniqueWithoutUserInputObjectSchema =
  Schema;
