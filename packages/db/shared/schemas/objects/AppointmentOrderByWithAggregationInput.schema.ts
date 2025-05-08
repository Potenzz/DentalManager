import { z } from 'zod';
import { SortOrderSchema } from '../enums/SortOrder.schema';
import { SortOrderInputObjectSchema } from './SortOrderInput.schema';
import { AppointmentCountOrderByAggregateInputObjectSchema } from './AppointmentCountOrderByAggregateInput.schema';
import { AppointmentAvgOrderByAggregateInputObjectSchema } from './AppointmentAvgOrderByAggregateInput.schema';
import { AppointmentMaxOrderByAggregateInputObjectSchema } from './AppointmentMaxOrderByAggregateInput.schema';
import { AppointmentMinOrderByAggregateInputObjectSchema } from './AppointmentMinOrderByAggregateInput.schema';
import { AppointmentSumOrderByAggregateInputObjectSchema } from './AppointmentSumOrderByAggregateInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.AppointmentOrderByWithAggregationInput> = z
  .object({
    id: z.lazy(() => SortOrderSchema).optional(),
    patientId: z.lazy(() => SortOrderSchema).optional(),
    userId: z.lazy(() => SortOrderSchema).optional(),
    title: z.lazy(() => SortOrderSchema).optional(),
    date: z.lazy(() => SortOrderSchema).optional(),
    startTime: z.lazy(() => SortOrderSchema).optional(),
    endTime: z.lazy(() => SortOrderSchema).optional(),
    type: z.lazy(() => SortOrderSchema).optional(),
    notes: z
      .union([
        z.lazy(() => SortOrderSchema),
        z.lazy(() => SortOrderInputObjectSchema),
      ])
      .optional(),
    status: z.lazy(() => SortOrderSchema).optional(),
    createdAt: z.lazy(() => SortOrderSchema).optional(),
    _count: z
      .lazy(() => AppointmentCountOrderByAggregateInputObjectSchema)
      .optional(),
    _avg: z
      .lazy(() => AppointmentAvgOrderByAggregateInputObjectSchema)
      .optional(),
    _max: z
      .lazy(() => AppointmentMaxOrderByAggregateInputObjectSchema)
      .optional(),
    _min: z
      .lazy(() => AppointmentMinOrderByAggregateInputObjectSchema)
      .optional(),
    _sum: z
      .lazy(() => AppointmentSumOrderByAggregateInputObjectSchema)
      .optional(),
  })
  .strict();

export const AppointmentOrderByWithAggregationInputObjectSchema = Schema;
