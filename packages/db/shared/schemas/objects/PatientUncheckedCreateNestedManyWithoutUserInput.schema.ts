import { z } from 'zod';
import { PatientCreateWithoutUserInputObjectSchema } from './PatientCreateWithoutUserInput.schema';
import { PatientUncheckedCreateWithoutUserInputObjectSchema } from './PatientUncheckedCreateWithoutUserInput.schema';
import { PatientCreateOrConnectWithoutUserInputObjectSchema } from './PatientCreateOrConnectWithoutUserInput.schema';
import { PatientCreateManyUserInputEnvelopeObjectSchema } from './PatientCreateManyUserInputEnvelope.schema';
import { PatientWhereUniqueInputObjectSchema } from './PatientWhereUniqueInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.PatientUncheckedCreateNestedManyWithoutUserInput> =
  z
    .object({
      create: z
        .union([
          z.lazy(() => PatientCreateWithoutUserInputObjectSchema),
          z.lazy(() => PatientCreateWithoutUserInputObjectSchema).array(),
          z.lazy(() => PatientUncheckedCreateWithoutUserInputObjectSchema),
          z
            .lazy(() => PatientUncheckedCreateWithoutUserInputObjectSchema)
            .array(),
        ])
        .optional(),
      connectOrCreate: z
        .union([
          z.lazy(() => PatientCreateOrConnectWithoutUserInputObjectSchema),
          z
            .lazy(() => PatientCreateOrConnectWithoutUserInputObjectSchema)
            .array(),
        ])
        .optional(),
      createMany: z
        .lazy(() => PatientCreateManyUserInputEnvelopeObjectSchema)
        .optional(),
      connect: z
        .union([
          z.lazy(() => PatientWhereUniqueInputObjectSchema),
          z.lazy(() => PatientWhereUniqueInputObjectSchema).array(),
        ])
        .optional(),
    })
    .strict();

export const PatientUncheckedCreateNestedManyWithoutUserInputObjectSchema =
  Schema;
