import { z } from 'zod';
import { PatientScalarWhereInputObjectSchema } from './PatientScalarWhereInput.schema';
import { PatientUpdateManyMutationInputObjectSchema } from './PatientUpdateManyMutationInput.schema';
import { PatientUncheckedUpdateManyWithoutPatientsInputObjectSchema } from './PatientUncheckedUpdateManyWithoutPatientsInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.PatientUpdateManyWithWhereWithoutUserInput> = z
  .object({
    where: z.lazy(() => PatientScalarWhereInputObjectSchema),
    data: z.union([
      z.lazy(() => PatientUpdateManyMutationInputObjectSchema),
      z.lazy(() => PatientUncheckedUpdateManyWithoutPatientsInputObjectSchema),
    ]),
  })
  .strict();

export const PatientUpdateManyWithWhereWithoutUserInputObjectSchema = Schema;
