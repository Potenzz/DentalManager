import { z } from 'zod';
import { PatientWhereUniqueInputObjectSchema } from './objects/PatientWhereUniqueInput.schema';
import { PatientCreateInputObjectSchema } from './objects/PatientCreateInput.schema';
import { PatientUncheckedCreateInputObjectSchema } from './objects/PatientUncheckedCreateInput.schema';
import { PatientUpdateInputObjectSchema } from './objects/PatientUpdateInput.schema';
import { PatientUncheckedUpdateInputObjectSchema } from './objects/PatientUncheckedUpdateInput.schema';

export const PatientUpsertSchema = z.object({
  where: PatientWhereUniqueInputObjectSchema,
  create: z.union([
    PatientCreateInputObjectSchema,
    PatientUncheckedCreateInputObjectSchema,
  ]),
  update: z.union([
    PatientUpdateInputObjectSchema,
    PatientUncheckedUpdateInputObjectSchema,
  ]),
});
