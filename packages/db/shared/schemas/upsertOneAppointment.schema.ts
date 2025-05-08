import { z } from 'zod';
import { AppointmentWhereUniqueInputObjectSchema } from './objects/AppointmentWhereUniqueInput.schema';
import { AppointmentCreateInputObjectSchema } from './objects/AppointmentCreateInput.schema';
import { AppointmentUncheckedCreateInputObjectSchema } from './objects/AppointmentUncheckedCreateInput.schema';
import { AppointmentUpdateInputObjectSchema } from './objects/AppointmentUpdateInput.schema';
import { AppointmentUncheckedUpdateInputObjectSchema } from './objects/AppointmentUncheckedUpdateInput.schema';

export const AppointmentUpsertSchema = z.object({
  where: AppointmentWhereUniqueInputObjectSchema,
  create: z.union([
    AppointmentCreateInputObjectSchema,
    AppointmentUncheckedCreateInputObjectSchema,
  ]),
  update: z.union([
    AppointmentUpdateInputObjectSchema,
    AppointmentUncheckedUpdateInputObjectSchema,
  ]),
});
