import { z } from 'zod';

export const AppointmentScalarFieldEnumSchema = z.enum([
  'id',
  'patientId',
  'userId',
  'title',
  'date',
  'startTime',
  'endTime',
  'type',
  'notes',
  'status',
  'createdAt',
]);
