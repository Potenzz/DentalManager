import { z } from 'zod';
import { PatientUpdateManyMutationInputObjectSchema } from './objects/PatientUpdateManyMutationInput.schema';
import { PatientWhereInputObjectSchema } from './objects/PatientWhereInput.schema';

export const PatientUpdateManySchema = z.object({
  data: PatientUpdateManyMutationInputObjectSchema,
  where: PatientWhereInputObjectSchema.optional(),
});
