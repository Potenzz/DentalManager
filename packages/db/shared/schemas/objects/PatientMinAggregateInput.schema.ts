import { z } from 'zod';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.PatientMinAggregateInputType> = z
  .object({
    id: z.literal(true).optional(),
    firstName: z.literal(true).optional(),
    lastName: z.literal(true).optional(),
    dateOfBirth: z.literal(true).optional(),
    gender: z.literal(true).optional(),
    phone: z.literal(true).optional(),
    email: z.literal(true).optional(),
    address: z.literal(true).optional(),
    city: z.literal(true).optional(),
    zipCode: z.literal(true).optional(),
    insuranceProvider: z.literal(true).optional(),
    insuranceId: z.literal(true).optional(),
    groupNumber: z.literal(true).optional(),
    policyHolder: z.literal(true).optional(),
    allergies: z.literal(true).optional(),
    medicalConditions: z.literal(true).optional(),
    status: z.literal(true).optional(),
    userId: z.literal(true).optional(),
    createdAt: z.literal(true).optional(),
  })
  .strict();

export const PatientMinAggregateInputObjectSchema = Schema;
