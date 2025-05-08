import { z } from 'zod';
import { PatientUpdateInputObjectSchema } from './objects/PatientUpdateInput.schema';
import { PatientUncheckedUpdateInputObjectSchema } from './objects/PatientUncheckedUpdateInput.schema';
import { PatientWhereUniqueInputObjectSchema } from './objects/PatientWhereUniqueInput.schema';

export const PatientUpdateOneSchema = z.object({
  data: z.union([
    PatientUpdateInputObjectSchema,
    PatientUncheckedUpdateInputObjectSchema,
  ]),
  where: PatientWhereUniqueInputObjectSchema,
});
