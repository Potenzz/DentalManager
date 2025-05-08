import { z } from 'zod';
import { PatientWhereUniqueInputObjectSchema } from './objects/PatientWhereUniqueInput.schema';

export const PatientFindUniqueSchema = z.object({
  where: PatientWhereUniqueInputObjectSchema,
});
