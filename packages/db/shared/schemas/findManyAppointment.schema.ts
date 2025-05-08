import { z } from 'zod';
import { AppointmentOrderByWithRelationInputObjectSchema } from './objects/AppointmentOrderByWithRelationInput.schema';
import { AppointmentWhereInputObjectSchema } from './objects/AppointmentWhereInput.schema';
import { AppointmentWhereUniqueInputObjectSchema } from './objects/AppointmentWhereUniqueInput.schema';
import { AppointmentScalarFieldEnumSchema } from './enums/AppointmentScalarFieldEnum.schema';

export const AppointmentFindManySchema = z.object({
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
  distinct: z.array(AppointmentScalarFieldEnumSchema).optional(),
});
