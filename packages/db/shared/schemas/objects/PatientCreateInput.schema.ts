import { z } from 'zod';
import { UserCreateNestedOneWithoutPatientsInputObjectSchema } from './UserCreateNestedOneWithoutPatientsInput.schema';
import { AppointmentCreateNestedManyWithoutPatientInputObjectSchema } from './AppointmentCreateNestedManyWithoutPatientInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.PatientCreateInput> = z
  .object({
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
    createdAt: z.coerce.date().optional(),
    user: z.lazy(() => UserCreateNestedOneWithoutPatientsInputObjectSchema),
    appointments: z
      .lazy(() => AppointmentCreateNestedManyWithoutPatientInputObjectSchema)
      .optional(),
  })
  .strict();

export const PatientCreateInputObjectSchema = Schema;
