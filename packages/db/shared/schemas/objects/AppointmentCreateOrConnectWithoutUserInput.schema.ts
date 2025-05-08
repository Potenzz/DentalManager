import { z } from 'zod';
import { AppointmentWhereUniqueInputObjectSchema } from './AppointmentWhereUniqueInput.schema';
import { AppointmentCreateWithoutUserInputObjectSchema } from './AppointmentCreateWithoutUserInput.schema';
import { AppointmentUncheckedCreateWithoutUserInputObjectSchema } from './AppointmentUncheckedCreateWithoutUserInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.AppointmentCreateOrConnectWithoutUserInput> = z
  .object({
    where: z.lazy(() => AppointmentWhereUniqueInputObjectSchema),
    create: z.union([
      z.lazy(() => AppointmentCreateWithoutUserInputObjectSchema),
      z.lazy(() => AppointmentUncheckedCreateWithoutUserInputObjectSchema),
    ]),
  })
  .strict();

export const AppointmentCreateOrConnectWithoutUserInputObjectSchema = Schema;
