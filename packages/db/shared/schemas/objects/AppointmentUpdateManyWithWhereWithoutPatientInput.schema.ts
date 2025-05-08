import { z } from 'zod';
import { AppointmentScalarWhereInputObjectSchema } from './AppointmentScalarWhereInput.schema';
import { AppointmentUpdateManyMutationInputObjectSchema } from './AppointmentUpdateManyMutationInput.schema';
import { AppointmentUncheckedUpdateManyWithoutAppointmentsInputObjectSchema } from './AppointmentUncheckedUpdateManyWithoutAppointmentsInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.AppointmentUpdateManyWithWhereWithoutPatientInput> =
  z
    .object({
      where: z.lazy(() => AppointmentScalarWhereInputObjectSchema),
      data: z.union([
        z.lazy(() => AppointmentUpdateManyMutationInputObjectSchema),
        z.lazy(
          () =>
            AppointmentUncheckedUpdateManyWithoutAppointmentsInputObjectSchema,
        ),
      ]),
    })
    .strict();

export const AppointmentUpdateManyWithWhereWithoutPatientInputObjectSchema =
  Schema;
