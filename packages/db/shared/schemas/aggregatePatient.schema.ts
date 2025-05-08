import { z } from 'zod';
import { PatientOrderByWithRelationInputObjectSchema } from './objects/PatientOrderByWithRelationInput.schema';
import { PatientWhereInputObjectSchema } from './objects/PatientWhereInput.schema';
import { PatientWhereUniqueInputObjectSchema } from './objects/PatientWhereUniqueInput.schema';
import { PatientCountAggregateInputObjectSchema } from './objects/PatientCountAggregateInput.schema';
import { PatientMinAggregateInputObjectSchema } from './objects/PatientMinAggregateInput.schema';
import { PatientMaxAggregateInputObjectSchema } from './objects/PatientMaxAggregateInput.schema';
import { PatientAvgAggregateInputObjectSchema } from './objects/PatientAvgAggregateInput.schema';
import { PatientSumAggregateInputObjectSchema } from './objects/PatientSumAggregateInput.schema';

export const PatientAggregateSchema = z.object({
  orderBy: z
    .union([
      PatientOrderByWithRelationInputObjectSchema,
      PatientOrderByWithRelationInputObjectSchema.array(),
    ])
    .optional(),
  where: PatientWhereInputObjectSchema.optional(),
  cursor: PatientWhereUniqueInputObjectSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  _count: z
    .union([z.literal(true), PatientCountAggregateInputObjectSchema])
    .optional(),
  _min: PatientMinAggregateInputObjectSchema.optional(),
  _max: PatientMaxAggregateInputObjectSchema.optional(),
  _avg: PatientAvgAggregateInputObjectSchema.optional(),
  _sum: PatientSumAggregateInputObjectSchema.optional(),
});
