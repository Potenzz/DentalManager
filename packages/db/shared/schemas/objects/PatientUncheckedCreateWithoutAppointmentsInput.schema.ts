import { z } from 'zod';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.PatientUncheckedCreateWithoutAppointmentsInput> =
  z
    .object({
      id: z.number().optional(),
      firstName: z.string(),
      lastName: z.string(),
      dateOfBirth: z.coerce.date(),
      gender: z.string(),
      phone: z.string(),
      email: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      city: z.string().optional().nullable(),
      zipCode: z.string().optional().nullable(),
      insuranceProvider: z.string().optional().nullable(),
      insuranceId: z.string().optional().nullable(),
      groupNumber: z.string().optional().nullable(),
      policyHolder: z.string().optional().nullable(),
      allergies: z.string().optional().nullable(),
      medicalConditions: z.string().optional().nullable(),
      status: z.string().optional(),
      userId: z.number(),
      createdAt: z.coerce.date().optional(),
    })
    .strict();

export const PatientUncheckedCreateWithoutAppointmentsInputObjectSchema =
  Schema;
