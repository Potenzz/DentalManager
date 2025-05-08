import { z } from 'zod';
import { AppointmentWhereInputObjectSchema } from './objects/AppointmentWhereInput.schema';

export const AppointmentDeleteManySchema = z.object({
  where: AppointmentWhereInputObjectSchema.optional(),
});
