import { z } from 'zod';

export const PatientScalarFieldEnumSchema = z.enum([
  'id',
  'firstName',
  'lastName',
  'dateOfBirth',
  'gender',
  'phone',
  'email',
  'address',
  'city',
  'zipCode',
  'insuranceProvider',
  'insuranceId',
  'groupNumber',
  'policyHolder',
  'allergies',
  'medicalConditions',
  'status',
  'userId',
  'createdAt',
]);
