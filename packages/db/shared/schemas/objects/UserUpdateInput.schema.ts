import { z } from 'zod';
import { StringFieldUpdateOperationsInputObjectSchema } from './StringFieldUpdateOperationsInput.schema';
import { PatientUpdateManyWithoutUserNestedInputObjectSchema } from './PatientUpdateManyWithoutUserNestedInput.schema';
import { AppointmentUpdateManyWithoutUserNestedInputObjectSchema } from './AppointmentUpdateManyWithoutUserNestedInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.UserUpdateInput> = z
  .object({
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
      .lazy(() => PatientUpdateManyWithoutUserNestedInputObjectSchema)
      .optional(),
    appointments: z
      .lazy(() => AppointmentUpdateManyWithoutUserNestedInputObjectSchema)
      .optional(),
  })
  .strict();

export const UserUpdateInputObjectSchema = Schema;
