import { z } from 'zod';
import { PatientWhereUniqueInputObjectSchema } from './PatientWhereUniqueInput.schema';
import { PatientCreateWithoutAppointmentsInputObjectSchema } from './PatientCreateWithoutAppointmentsInput.schema';
import { PatientUncheckedCreateWithoutAppointmentsInputObjectSchema } from './PatientUncheckedCreateWithoutAppointmentsInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.PatientCreateOrConnectWithoutAppointmentsInput> =
  z
    .object({
      where: z.lazy(() => PatientWhereUniqueInputObjectSchema),
      create: z.union([
        z.lazy(() => PatientCreateWithoutAppointmentsInputObjectSchema),
        z.lazy(
          () => PatientUncheckedCreateWithoutAppointmentsInputObjectSchema,
        ),
      ]),
    })
    .strict();

export const PatientCreateOrConnectWithoutAppointmentsInputObjectSchema =
  Schema;
