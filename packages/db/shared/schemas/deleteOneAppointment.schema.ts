import { z } from 'zod';
import { AppointmentWhereUniqueInputObjectSchema } from './objects/AppointmentWhereUniqueInput.schema';

export const AppointmentDeleteOneSchema = z.object({
  where: AppointmentWhereUniqueInputObjectSchema,
});
