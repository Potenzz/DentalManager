import { z } from 'zod';
import { AppointmentWhereUniqueInputObjectSchema } from './objects/AppointmentWhereUniqueInput.schema';

export const AppointmentFindUniqueSchema = z.object({
  where: AppointmentWhereUniqueInputObjectSchema,
});
