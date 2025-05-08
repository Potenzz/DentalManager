import { z } from 'zod';
import { AppointmentCreateWithoutUserInputObjectSchema } from './AppointmentCreateWithoutUserInput.schema';
import { AppointmentUncheckedCreateWithoutUserInputObjectSchema } from './AppointmentUncheckedCreateWithoutUserInput.schema';
import { AppointmentCreateOrConnectWithoutUserInputObjectSchema } from './AppointmentCreateOrConnectWithoutUserInput.schema';
import { AppointmentCreateManyUserInputEnvelopeObjectSchema } from './AppointmentCreateManyUserInputEnvelope.schema';
import { AppointmentWhereUniqueInputObjectSchema } from './AppointmentWhereUniqueInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.AppointmentUncheckedCreateNestedManyWithoutUserInput> =
  z
    .object({
      create: z
        .union([
          z.lazy(() => AppointmentCreateWithoutUserInputObjectSchema),
          z.lazy(() => AppointmentCreateWithoutUserInputObjectSchema).array(),
          z.lazy(() => AppointmentUncheckedCreateWithoutUserInputObjectSchema),
          z
            .lazy(() => AppointmentUncheckedCreateWithoutUserInputObjectSchema)
            .array(),
        ])
        .optional(),
      connectOrCreate: z
        .union([
          z.lazy(() => AppointmentCreateOrConnectWithoutUserInputObjectSchema),
          z
            .lazy(() => AppointmentCreateOrConnectWithoutUserInputObjectSchema)
            .array(),
        ])
        .optional(),
      createMany: z
        .lazy(() => AppointmentCreateManyUserInputEnvelopeObjectSchema)
        .optional(),
      connect: z
        .union([
          z.lazy(() => AppointmentWhereUniqueInputObjectSchema),
          z.lazy(() => AppointmentWhereUniqueInputObjectSchema).array(),
        ])
        .optional(),
    })
    .strict();

export const AppointmentUncheckedCreateNestedManyWithoutUserInputObjectSchema =
  Schema;
