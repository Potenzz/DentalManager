import { z } from 'zod';
import { AppointmentWhereUniqueInputObjectSchema } from './AppointmentWhereUniqueInput.schema';
import { AppointmentUpdateWithoutPatientInputObjectSchema } from './AppointmentUpdateWithoutPatientInput.schema';
import { AppointmentUncheckedUpdateWithoutPatientInputObjectSchema } from './AppointmentUncheckedUpdateWithoutPatientInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.AppointmentUpdateWithWhereUniqueWithoutPatientInput> =
  z
    .object({
      where: z.lazy(() => AppointmentWhereUniqueInputObjectSchema),
      data: z.union([
        z.lazy(() => AppointmentUpdateWithoutPatientInputObjectSchema),
        z.lazy(() => AppointmentUncheckedUpdateWithoutPatientInputObjectSchema),
      ]),
    })
    .strict();

export const AppointmentUpdateWithWhereUniqueWithoutPatientInputObjectSchema =
  Schema;
