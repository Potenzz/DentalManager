import { z } from 'zod';
import { AppointmentCreateWithoutPatientInputObjectSchema } from './AppointmentCreateWithoutPatientInput.schema';
import { AppointmentUncheckedCreateWithoutPatientInputObjectSchema } from './AppointmentUncheckedCreateWithoutPatientInput.schema';
import { AppointmentCreateOrConnectWithoutPatientInputObjectSchema } from './AppointmentCreateOrConnectWithoutPatientInput.schema';
import { AppointmentUpsertWithWhereUniqueWithoutPatientInputObjectSchema } from './AppointmentUpsertWithWhereUniqueWithoutPatientInput.schema';
import { AppointmentCreateManyPatientInputEnvelopeObjectSchema } from './AppointmentCreateManyPatientInputEnvelope.schema';
import { AppointmentWhereUniqueInputObjectSchema } from './AppointmentWhereUniqueInput.schema';
import { AppointmentUpdateWithWhereUniqueWithoutPatientInputObjectSchema } from './AppointmentUpdateWithWhereUniqueWithoutPatientInput.schema';
import { AppointmentUpdateManyWithWhereWithoutPatientInputObjectSchema } from './AppointmentUpdateManyWithWhereWithoutPatientInput.schema';
import { AppointmentScalarWhereInputObjectSchema } from './AppointmentScalarWhereInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.AppointmentUncheckedUpdateManyWithoutPatientNestedInput> =
  z
    .object({
      create: z
        .union([
          z.lazy(() => AppointmentCreateWithoutPatientInputObjectSchema),
          z
            .lazy(() => AppointmentCreateWithoutPatientInputObjectSchema)
            .array(),
          z.lazy(
            () => AppointmentUncheckedCreateWithoutPatientInputObjectSchema,
          ),
          z
            .lazy(
              () => AppointmentUncheckedCreateWithoutPatientInputObjectSchema,
            )
            .array(),
        ])
        .optional(),
      connectOrCreate: z
        .union([
          z.lazy(
            () => AppointmentCreateOrConnectWithoutPatientInputObjectSchema,
          ),
          z
            .lazy(
              () => AppointmentCreateOrConnectWithoutPatientInputObjectSchema,
            )
            .array(),
        ])
        .optional(),
      upsert: z
        .union([
          z.lazy(
            () =>
              AppointmentUpsertWithWhereUniqueWithoutPatientInputObjectSchema,
          ),
          z
            .lazy(
              () =>
                AppointmentUpsertWithWhereUniqueWithoutPatientInputObjectSchema,
            )
            .array(),
        ])
        .optional(),
      createMany: z
        .lazy(() => AppointmentCreateManyPatientInputEnvelopeObjectSchema)
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
            () =>
              AppointmentUpdateWithWhereUniqueWithoutPatientInputObjectSchema,
          ),
          z
            .lazy(
              () =>
                AppointmentUpdateWithWhereUniqueWithoutPatientInputObjectSchema,
            )
            .array(),
        ])
        .optional(),
      updateMany: z
        .union([
          z.lazy(
            () => AppointmentUpdateManyWithWhereWithoutPatientInputObjectSchema,
          ),
          z
            .lazy(
              () =>
                AppointmentUpdateManyWithWhereWithoutPatientInputObjectSchema,
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

export const AppointmentUncheckedUpdateManyWithoutPatientNestedInputObjectSchema =
  Schema;
