import { z } from 'zod';
import { SortOrderSchema } from '../enums/SortOrder.schema';
import { PatientOrderByRelationAggregateInputObjectSchema } from './PatientOrderByRelationAggregateInput.schema';
import { AppointmentOrderByRelationAggregateInputObjectSchema } from './AppointmentOrderByRelationAggregateInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.UserOrderByWithRelationInput> = z
  .object({
    id: z.lazy(() => SortOrderSchema).optional(),
    username: z.lazy(() => SortOrderSchema).optional(),
    password: z.lazy(() => SortOrderSchema).optional(),
    patients: z
      .lazy(() => PatientOrderByRelationAggregateInputObjectSchema)
      .optional(),
    appointments: z
      .lazy(() => AppointmentOrderByRelationAggregateInputObjectSchema)
      .optional(),
  })
  .strict();

export const UserOrderByWithRelationInputObjectSchema = Schema;
