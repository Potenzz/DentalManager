import { z } from 'zod';
import { PatientWhereInputObjectSchema } from './objects/PatientWhereInput.schema';

export const PatientDeleteManySchema = z.object({
  where: PatientWhereInputObjectSchema.optional(),
});
