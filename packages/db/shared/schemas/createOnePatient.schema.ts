import { z } from 'zod';
import { PatientCreateInputObjectSchema } from './objects/PatientCreateInput.schema';
import { PatientUncheckedCreateInputObjectSchema } from './objects/PatientUncheckedCreateInput.schema';

export const PatientCreateOneSchema = z.object({
  data: z.union([
    PatientCreateInputObjectSchema,
    PatientUncheckedCreateInputObjectSchema,
  ]),
});
