import { z } from 'zod';
import { AppointmentWhereInputObjectSchema } from './objects/AppointmentWhereInput.schema';
import { AppointmentOrderByWithAggregationInputObjectSchema } from './objects/AppointmentOrderByWithAggregationInput.schema';
import { AppointmentScalarWhereWithAggregatesInputObjectSchema } from './objects/AppointmentScalarWhereWithAggregatesInput.schema';
import { AppointmentScalarFieldEnumSchema } from './enums/AppointmentScalarFieldEnum.schema';

export const AppointmentGroupBySchema = z.object({
  where: AppointmentWhereInputObjectSchema.optional(),
  orderBy: z
    .union([
      AppointmentOrderByWithAggregationInputObjectSchema,
      AppointmentOrderByWithAggregationInputObjectSchema.array(),
    ])
    .optional(),
  having: AppointmentScalarWhereWithAggregatesInputObjectSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  by: z.array(AppointmentScalarFieldEnumSchema),
});
