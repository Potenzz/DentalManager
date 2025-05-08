import { z } from 'zod';
import { SortOrderSchema } from '../enums/SortOrder.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.PatientMinOrderByAggregateInput> = z
  .object({
    id: z.lazy(() => SortOrderSchema).optional(),
    firstName: z.lazy(() => SortOrderSchema).optional(),
    lastName: z.lazy(() => SortOrderSchema).optional(),
    dateOfBirth: z.lazy(() => SortOrderSchema).optional(),
    gender: z.lazy(() => SortOrderSchema).optional(),
    phone: z.lazy(() => SortOrderSchema).optional(),
    email: z.lazy(() => SortOrderSchema).optional(),
    address: z.lazy(() => SortOrderSchema).optional(),
    city: z.lazy(() => SortOrderSchema).optional(),
    zipCode: z.lazy(() => SortOrderSchema).optional(),
    insuranceProvider: z.lazy(() => SortOrderSchema).optional(),
    insuranceId: z.lazy(() => SortOrderSchema).optional(),
    groupNumber: z.lazy(() => SortOrderSchema).optional(),
    policyHolder: z.lazy(() => SortOrderSchema).optional(),
    allergies: z.lazy(() => SortOrderSchema).optional(),
    medicalConditions: z.lazy(() => SortOrderSchema).optional(),
    status: z.lazy(() => SortOrderSchema).optional(),
    userId: z.lazy(() => SortOrderSchema).optional(),
    createdAt: z.lazy(() => SortOrderSchema).optional(),
  })
  .strict();

export const PatientMinOrderByAggregateInputObjectSchema = Schema;
