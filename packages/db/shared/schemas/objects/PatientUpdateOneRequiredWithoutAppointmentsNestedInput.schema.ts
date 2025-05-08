import { z } from 'zod';
import { PatientCreateWithoutAppointmentsInputObjectSchema } from './PatientCreateWithoutAppointmentsInput.schema';
import { PatientUncheckedCreateWithoutAppointmentsInputObjectSchema } from './PatientUncheckedCreateWithoutAppointmentsInput.schema';
import { PatientCreateOrConnectWithoutAppointmentsInputObjectSchema } from './PatientCreateOrConnectWithoutAppointmentsInput.schema';
import { PatientUpsertWithoutAppointmentsInputObjectSchema } from './PatientUpsertWithoutAppointmentsInput.schema';
import { PatientWhereUniqueInputObjectSchema } from './PatientWhereUniqueInput.schema';
import { PatientUpdateWithoutAppointmentsInputObjectSchema } from './PatientUpdateWithoutAppointmentsInput.schema';
import { PatientUncheckedUpdateWithoutAppointmentsInputObjectSchema } from './PatientUncheckedUpdateWithoutAppointmentsInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.PatientUpdateOneRequiredWithoutAppointmentsNestedInput> =
  z
    .object({
      create: z
        .union([
          z.lazy(() => PatientCreateWithoutAppointmentsInputObjectSchema),
          z.lazy(
            () => PatientUncheckedCreateWithoutAppointmentsInputObjectSchema,
          ),
        ])
        .optional(),
      connectOrCreate: z
        .lazy(() => PatientCreateOrConnectWithoutAppointmentsInputObjectSchema)
        .optional(),
      upsert: z
        .lazy(() => PatientUpsertWithoutAppointmentsInputObjectSchema)
        .optional(),
      connect: z.lazy(() => PatientWhereUniqueInputObjectSchema).optional(),
      update: z
        .union([
          z.lazy(() => PatientUpdateWithoutAppointmentsInputObjectSchema),
          z.lazy(
            () => PatientUncheckedUpdateWithoutAppointmentsInputObjectSchema,
          ),
        ])
        .optional(),
    })
    .strict();

export const PatientUpdateOneRequiredWithoutAppointmentsNestedInputObjectSchema =
  Schema;
