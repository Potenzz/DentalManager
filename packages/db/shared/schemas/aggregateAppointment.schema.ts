import { z } from 'zod';
import { AppointmentOrderByWithRelationInputObjectSchema } from './objects/AppointmentOrderByWithRelationInput.schema';
import { AppointmentWhereInputObjectSchema } from './objects/AppointmentWhereInput.schema';
import { AppointmentWhereUniqueInputObjectSchema } from './objects/AppointmentWhereUniqueInput.schema';
import { AppointmentCountAggregateInputObjectSchema } from './objects/AppointmentCountAggregateInput.schema';
import { AppointmentMinAggregateInputObjectSchema } from './objects/AppointmentMinAggregateInput.schema';
import { AppointmentMaxAggregateInputObjectSchema } from './objects/AppointmentMaxAggregateInput.schema';
import { AppointmentAvgAggregateInputObjectSchema } from './objects/AppointmentAvgAggregateInput.schema';
import { AppointmentSumAggregateInputObjectSchema } from './objects/AppointmentSumAggregateInput.schema';

export const AppointmentAggregateSchema = z.object({
  orderBy: z
    .union([
      AppointmentOrderByWithRelationInputObjectSchema,
      AppointmentOrderByWithRelationInputObjectSchema.array(),
    ])
    .optional(),
  where: AppointmentWhereInputObjectSchema.optional(),
  cursor: AppointmentWhereUniqueInputObjectSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  _count: z
    .union([z.literal(true), AppointmentCountAggregateInputObjectSchema])
    .optional(),
  _min: AppointmentMinAggregateInputObjectSchema.optional(),
  _max: AppointmentMaxAggregateInputObjectSchema.optional(),
  _avg: AppointmentAvgAggregateInputObjectSchema.optional(),
  _sum: AppointmentSumAggregateInputObjectSchema.optional(),
});
