import { z } from 'zod';
import { PatientCreateWithoutUserInputObjectSchema } from './PatientCreateWithoutUserInput.schema';
import { PatientUncheckedCreateWithoutUserInputObjectSchema } from './PatientUncheckedCreateWithoutUserInput.schema';
import { PatientCreateOrConnectWithoutUserInputObjectSchema } from './PatientCreateOrConnectWithoutUserInput.schema';
import { PatientUpsertWithWhereUniqueWithoutUserInputObjectSchema } from './PatientUpsertWithWhereUniqueWithoutUserInput.schema';
import { PatientCreateManyUserInputEnvelopeObjectSchema } from './PatientCreateManyUserInputEnvelope.schema';
import { PatientWhereUniqueInputObjectSchema } from './PatientWhereUniqueInput.schema';
import { PatientUpdateWithWhereUniqueWithoutUserInputObjectSchema } from './PatientUpdateWithWhereUniqueWithoutUserInput.schema';
import { PatientUpdateManyWithWhereWithoutUserInputObjectSchema } from './PatientUpdateManyWithWhereWithoutUserInput.schema';
import { PatientScalarWhereInputObjectSchema } from './PatientScalarWhereInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.PatientUpdateManyWithoutUserNestedInput> = z
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
    upsert: z
      .union([
        z.lazy(() => PatientUpsertWithWhereUniqueWithoutUserInputObjectSchema),
        z
          .lazy(() => PatientUpsertWithWhereUniqueWithoutUserInputObjectSchema)
          .array(),
      ])
      .optional(),
    createMany: z
      .lazy(() => PatientCreateManyUserInputEnvelopeObjectSchema)
      .optional(),
    set: z
      .union([
        z.lazy(() => PatientWhereUniqueInputObjectSchema),
        z.lazy(() => PatientWhereUniqueInputObjectSchema).array(),
      ])
      .optional(),
    disconnect: z
      .union([
        z.lazy(() => PatientWhereUniqueInputObjectSchema),
        z.lazy(() => PatientWhereUniqueInputObjectSchema).array(),
      ])
      .optional(),
    delete: z
      .union([
        z.lazy(() => PatientWhereUniqueInputObjectSchema),
        z.lazy(() => PatientWhereUniqueInputObjectSchema).array(),
      ])
      .optional(),
    connect: z
      .union([
        z.lazy(() => PatientWhereUniqueInputObjectSchema),
        z.lazy(() => PatientWhereUniqueInputObjectSchema).array(),
      ])
      .optional(),
    update: z
      .union([
        z.lazy(() => PatientUpdateWithWhereUniqueWithoutUserInputObjectSchema),
        z
          .lazy(() => PatientUpdateWithWhereUniqueWithoutUserInputObjectSchema)
          .array(),
      ])
      .optional(),
    updateMany: z
      .union([
        z.lazy(() => PatientUpdateManyWithWhereWithoutUserInputObjectSchema),
        z
          .lazy(() => PatientUpdateManyWithWhereWithoutUserInputObjectSchema)
          .array(),
      ])
      .optional(),
    deleteMany: z
      .union([
        z.lazy(() => PatientScalarWhereInputObjectSchema),
        z.lazy(() => PatientScalarWhereInputObjectSchema).array(),
      ])
      .optional(),
  })
  .strict();

export const PatientUpdateManyWithoutUserNestedInputObjectSchema = Schema;
