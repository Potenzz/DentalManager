import { z } from 'zod';
import { AppointmentUpdateManyMutationInputObjectSchema } from './objects/AppointmentUpdateManyMutationInput.schema';
import { AppointmentWhereInputObjectSchema } from './objects/AppointmentWhereInput.schema';

export const AppointmentUpdateManySchema = z.object({
  data: AppointmentUpdateManyMutationInputObjectSchema,
  where: AppointmentWhereInputObjectSchema.optional(),
});
