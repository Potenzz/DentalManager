import { z } from 'zod';
import { PatientCreateWithoutAppointmentsInputObjectSchema } from './PatientCreateWithoutAppointmentsInput.schema';
import { PatientUncheckedCreateWithoutAppointmentsInputObjectSchema } from './PatientUncheckedCreateWithoutAppointmentsInput.schema';
import { PatientCreateOrConnectWithoutAppointmentsInputObjectSchema } from './PatientCreateOrConnectWithoutAppointmentsInput.schema';
import { PatientWhereUniqueInputObjectSchema } from './PatientWhereUniqueInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.PatientCreateNestedOneWithoutAppointmentsInput> =
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
      connect: z.lazy(() => PatientWhereUniqueInputObjectSchema).optional(),
    })
    .strict();

export const PatientCreateNestedOneWithoutAppointmentsInputObjectSchema =
  Schema;
