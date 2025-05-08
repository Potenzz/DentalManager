import { z } from 'zod';
import { IntFieldUpdateOperationsInputObjectSchema } from './IntFieldUpdateOperationsInput.schema';
import { StringFieldUpdateOperationsInputObjectSchema } from './StringFieldUpdateOperationsInput.schema';
import { PatientUncheckedUpdateManyWithoutUserNestedInputObjectSchema } from './PatientUncheckedUpdateManyWithoutUserNestedInput.schema';
import { AppointmentUncheckedUpdateManyWithoutUserNestedInputObjectSchema } from './AppointmentUncheckedUpdateManyWithoutUserNestedInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.UserUncheckedUpdateInput> = z
  .object({
    id: z
      .union([
        z.number(),
        z.lazy(() => IntFieldUpdateOperationsInputObjectSchema),
      ])
      .optional(),
    username: z
      .union([
        z.string(),
        z.lazy(() => StringFieldUpdateOperationsInputObjectSchema),
      ])
      .optional(),
    password: z
      .union([
        z.string(),
        z.lazy(() => StringFieldUpdateOperationsInputObjectSchema),
      ])
      .optional(),
    patients: z
      .lazy(() => PatientUncheckedUpdateManyWithoutUserNestedInputObjectSchema)
      .optional(),
    appointments: z
      .lazy(
        () => AppointmentUncheckedUpdateManyWithoutUserNestedInputObjectSchema,
      )
      .optional(),
  })
  .strict();

export const UserUncheckedUpdateInputObjectSchema = Schema;
