import { z } from 'zod';
import { PatientWhereUniqueInputObjectSchema } from './objects/PatientWhereUniqueInput.schema';

export const PatientDeleteOneSchema = z.object({
  where: PatientWhereUniqueInputObjectSchema,
});
