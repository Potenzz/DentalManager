import { z } from 'zod';
import { SortOrderSchema } from '../enums/SortOrder.schema';
import { SortOrderInputObjectSchema } from './SortOrderInput.schema';
import { PatientCountOrderByAggregateInputObjectSchema } from './PatientCountOrderByAggregateInput.schema';
import { PatientAvgOrderByAggregateInputObjectSchema } from './PatientAvgOrderByAggregateInput.schema';
import { PatientMaxOrderByAggregateInputObjectSchema } from './PatientMaxOrderByAggregateInput.schema';
import { PatientMinOrderByAggregateInputObjectSchema } from './PatientMinOrderByAggregateInput.schema';
import { PatientSumOrderByAggregateInputObjectSchema } from './PatientSumOrderByAggregateInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.PatientOrderByWithAggregationInput> = z
  .object({
    id: z.lazy(() => SortOrderSchema).optional(),
    firstName: z.lazy(() => SortOrderSchema).optional(),
    lastName: z.lazy(() => SortOrderSchema).optional(),
    dateOfBirth: z.lazy(() => SortOrderSchema).optional(),
    gender: z.lazy(() => SortOrderSchema).optional(),
    phone: z.lazy(() => SortOrderSchema).optional(),
    email: z
      .union([
        z.lazy(() => SortOrderSchema),
        z.lazy(() => SortOrderInputObjectSchema),
      ])
      .optional(),
    address: z
      .union([
        z.lazy(() => SortOrderSchema),
        z.lazy(() => SortOrderInputObjectSchema),
      ])
      .optional(),
    city: z
      .union([
        z.lazy(() => SortOrderSchema),
        z.lazy(() => SortOrderInputObjectSchema),
      ])
      .optional(),
    zipCode: z
      .union([
        z.lazy(() => SortOrderSchema),
        z.lazy(() => SortOrderInputObjectSchema),
      ])
      .optional(),
    insuranceProvider: z
      .union([
        z.lazy(() => SortOrderSchema),
        z.lazy(() => SortOrderInputObjectSchema),
      ])
      .optional(),
    insuranceId: z
      .union([
        z.lazy(() => SortOrderSchema),
        z.lazy(() => SortOrderInputObjectSchema),
      ])
      .optional(),
    groupNumber: z
      .union([
        z.lazy(() => SortOrderSchema),
        z.lazy(() => SortOrderInputObjectSchema),
      ])
      .optional(),
    policyHolder: z
      .union([
        z.lazy(() => SortOrderSchema),
        z.lazy(() => SortOrderInputObjectSchema),
      ])
      .optional(),
    allergies: z
      .union([
        z.lazy(() => SortOrderSchema),
        z.lazy(() => SortOrderInputObjectSchema),
      ])
      .optional(),
    medicalConditions: z
      .union([
        z.lazy(() => SortOrderSchema),
        z.lazy(() => SortOrderInputObjectSchema),
      ])
      .optional(),
    status: z.lazy(() => SortOrderSchema).optional(),
    userId: z.lazy(() => SortOrderSchema).optional(),
    createdAt: z.lazy(() => SortOrderSchema).optional(),
    _count: z
      .lazy(() => PatientCountOrderByAggregateInputObjectSchema)
      .optional(),
    _avg: z.lazy(() => PatientAvgOrderByAggregateInputObjectSchema).optional(),
    _max: z.lazy(() => PatientMaxOrderByAggregateInputObjectSchema).optional(),
    _min: z.lazy(() => PatientMinOrderByAggregateInputObjectSchema).optional(),
    _sum: z.lazy(() => PatientSumOrderByAggregateInputObjectSchema).optional(),
  })
  .strict();

export const PatientOrderByWithAggregationInputObjectSchema = Schema;
