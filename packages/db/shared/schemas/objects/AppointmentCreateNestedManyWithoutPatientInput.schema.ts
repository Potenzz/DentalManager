import { z } from 'zod';
import { AppointmentCreateWithoutPatientInputObjectSchema } from './AppointmentCreateWithoutPatientInput.schema';
import { AppointmentUncheckedCreateWithoutPatientInputObjectSchema } from './AppointmentUncheckedCreateWithoutPatientInput.schema';
import { AppointmentCreateOrConnectWithoutPatientInputObjectSchema } from './AppointmentCreateOrConnectWithoutPatientInput.schema';
import { AppointmentCreateManyPatientInputEnvelopeObjectSchema } from './AppointmentCreateManyPatientInputEnvelope.schema';
import { AppointmentWhereUniqueInputObjectSchema } from './AppointmentWhereUniqueInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.AppointmentCreateNestedManyWithoutPatientInput> =
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
      createMany: z
        .lazy(() => AppointmentCreateManyPatientInputEnvelopeObjectSchema)
        .optional(),
      connect: z
        .union([
          z.lazy(() => AppointmentWhereUniqueInputObjectSchema),
          z.lazy(() => AppointmentWhereUniqueInputObjectSchema).array(),
        ])
        .optional(),
    })
    .strict();

export const AppointmentCreateNestedManyWithoutPatientInputObjectSchema =
  Schema;
