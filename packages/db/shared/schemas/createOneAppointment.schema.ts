import { z } from 'zod';
import { AppointmentCreateInputObjectSchema } from './objects/AppointmentCreateInput.schema';
import { AppointmentUncheckedCreateInputObjectSchema } from './objects/AppointmentUncheckedCreateInput.schema';

export const AppointmentCreateOneSchema = z.object({
  data: z.union([
    AppointmentCreateInputObjectSchema,
    AppointmentUncheckedCreateInputObjectSchema,
  ]),
});
