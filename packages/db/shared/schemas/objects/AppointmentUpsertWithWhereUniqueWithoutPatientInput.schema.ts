import { z } from 'zod';
import { AppointmentWhereUniqueInputObjectSchema } from './AppointmentWhereUniqueInput.schema';
import { AppointmentUpdateWithoutPatientInputObjectSchema } from './AppointmentUpdateWithoutPatientInput.schema';
import { AppointmentUncheckedUpdateWithoutPatientInputObjectSchema } from './AppointmentUncheckedUpdateWithoutPatientInput.schema';
import { AppointmentCreateWithoutPatientInputObjectSchema } from './AppointmentCreateWithoutPatientInput.schema';
import { AppointmentUncheckedCreateWithoutPatientInputObjectSchema } from './AppointmentUncheckedCreateWithoutPatientInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.AppointmentUpsertWithWhereUniqueWithoutPatientInput> =
  z
    .object({
      where: z.lazy(() => AppointmentWhereUniqueInputObjectSchema),
      update: z.union([
        z.lazy(() => AppointmentUpdateWithoutPatientInputObjectSchema),
        z.lazy(() => AppointmentUncheckedUpdateWithoutPatientInputObjectSchema),
      ]),
      create: z.union([
        z.lazy(() => AppointmentCreateWithoutPatientInputObjectSchema),
        z.lazy(() => AppointmentUncheckedCreateWithoutPatientInputObjectSchema),
      ]),
    })
    .strict();

export const AppointmentUpsertWithWhereUniqueWithoutPatientInputObjectSchema =
  Schema;
