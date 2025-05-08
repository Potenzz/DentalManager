import { z } from 'zod';
import { AppointmentUpdateInputObjectSchema } from './objects/AppointmentUpdateInput.schema';
import { AppointmentUncheckedUpdateInputObjectSchema } from './objects/AppointmentUncheckedUpdateInput.schema';
import { AppointmentWhereUniqueInputObjectSchema } from './objects/AppointmentWhereUniqueInput.schema';

export const AppointmentUpdateOneSchema = z.object({
  data: z.union([
    AppointmentUpdateInputObjectSchema,
    AppointmentUncheckedUpdateInputObjectSchema,
  ]),
  where: AppointmentWhereUniqueInputObjectSchema,
});
