import { z } from 'zod';
import { AppointmentCreateWithoutUserInputObjectSchema } from './AppointmentCreateWithoutUserInput.schema';
import { AppointmentUncheckedCreateWithoutUserInputObjectSchema } from './AppointmentUncheckedCreateWithoutUserInput.schema';
import { AppointmentCreateOrConnectWithoutUserInputObjectSchema } from './AppointmentCreateOrConnectWithoutUserInput.schema';
import { AppointmentUpsertWithWhereUniqueWithoutUserInputObjectSchema } from './AppointmentUpsertWithWhereUniqueWithoutUserInput.schema';
import { AppointmentCreateManyUserInputEnvelopeObjectSchema } from './AppointmentCreateManyUserInputEnvelope.schema';
import { AppointmentWhereUniqueInputObjectSchema } from './AppointmentWhereUniqueInput.schema';
import { AppointmentUpdateWithWhereUniqueWithoutUserInputObjectSchema } from './AppointmentUpdateWithWhereUniqueWithoutUserInput.schema';
import { AppointmentUpdateManyWithWhereWithoutUserInputObjectSchema } from './AppointmentUpdateManyWithWhereWithoutUserInput.schema';
import { AppointmentScalarWhereInputObjectSchema } from './AppointmentScalarWhereInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.AppointmentUncheckedUpdateManyWithoutUserNestedInput> =
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
      upsert: z
        .union([
          z.lazy(
            () => AppointmentUpsertWithWhereUniqueWithoutUserInputObjectSchema,
          ),
          z
            .lazy(
              () =>
                AppointmentUpsertWithWhereUniqueWithoutUserInputObjectSchema,
            )
            .array(),
        ])
        .optional(),
      createMany: z
        .lazy(() => AppointmentCreateManyUserInputEnvelopeObjectSchema)
        .optional(),
      set: z
        .union([
          z.lazy(() => AppointmentWhereUniqueInputObjectSchema),
          z.lazy(() => AppointmentWhereUniqueInputObjectSchema).array(),
        ])
        .optional(),
      disconnect: z
        .union([
          z.lazy(() => AppointmentWhereUniqueInputObjectSchema),
          z.lazy(() => AppointmentWhereUniqueInputObjectSchema).array(),
        ])
        .optional(),
      delete: z
        .union([
          z.lazy(() => AppointmentWhereUniqueInputObjectSchema),
          z.lazy(() => AppointmentWhereUniqueInputObjectSchema).array(),
        ])
        .optional(),
      connect: z
        .union([
          z.lazy(() => AppointmentWhereUniqueInputObjectSchema),
          z.lazy(() => AppointmentWhereUniqueInputObjectSchema).array(),
        ])
        .optional(),
      update: z
        .union([
          z.lazy(
            () => AppointmentUpdateWithWhereUniqueWithoutUserInputObjectSchema,
          ),
          z
            .lazy(
              () =>
                AppointmentUpdateWithWhereUniqueWithoutUserInputObjectSchema,
            )
            .array(),
        ])
        .optional(),
      updateMany: z
        .union([
          z.lazy(
            () => AppointmentUpdateManyWithWhereWithoutUserInputObjectSchema,
          ),
          z
            .lazy(
              () => AppointmentUpdateManyWithWhereWithoutUserInputObjectSchema,
            )
            .array(),
        ])
        .optional(),
      deleteMany: z
        .union([
          z.lazy(() => AppointmentScalarWhereInputObjectSchema),
          z.lazy(() => AppointmentScalarWhereInputObjectSchema).array(),
        ])
        .optional(),
    })
    .strict();

export const AppointmentUncheckedUpdateManyWithoutUserNestedInputObjectSchema =
  Schema;
