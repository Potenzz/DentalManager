import { z } from 'zod';
import { PatientUpdateWithoutAppointmentsInputObjectSchema } from './PatientUpdateWithoutAppointmentsInput.schema';
import { PatientUncheckedUpdateWithoutAppointmentsInputObjectSchema } from './PatientUncheckedUpdateWithoutAppointmentsInput.schema';
import { PatientCreateWithoutAppointmentsInputObjectSchema } from './PatientCreateWithoutAppointmentsInput.schema';
import { PatientUncheckedCreateWithoutAppointmentsInputObjectSchema } from './PatientUncheckedCreateWithoutAppointmentsInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.PatientUpsertWithoutAppointmentsInput> = z
  .object({
    update: z.union([
      z.lazy(() => PatientUpdateWithoutAppointmentsInputObjectSchema),
      z.lazy(() => PatientUncheckedUpdateWithoutAppointmentsInputObjectSchema),
    ]),
    create: z.union([
      z.lazy(() => PatientCreateWithoutAppointmentsInputObjectSchema),
      z.lazy(() => PatientUncheckedCreateWithoutAppointmentsInputObjectSchema),
    ]),
  })
  .strict();

export const PatientUpsertWithoutAppointmentsInputObjectSchema = Schema;
