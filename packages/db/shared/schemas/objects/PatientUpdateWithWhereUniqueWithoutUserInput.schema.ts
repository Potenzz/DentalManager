import { z } from 'zod';
import { PatientWhereUniqueInputObjectSchema } from './PatientWhereUniqueInput.schema';
import { PatientUpdateWithoutUserInputObjectSchema } from './PatientUpdateWithoutUserInput.schema';
import { PatientUncheckedUpdateWithoutUserInputObjectSchema } from './PatientUncheckedUpdateWithoutUserInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.PatientUpdateWithWhereUniqueWithoutUserInput> = z
  .object({
    where: z.lazy(() => PatientWhereUniqueInputObjectSchema),
    data: z.union([
      z.lazy(() => PatientUpdateWithoutUserInputObjectSchema),
      z.lazy(() => PatientUncheckedUpdateWithoutUserInputObjectSchema),
    ]),
  })
  .strict();

export const PatientUpdateWithWhereUniqueWithoutUserInputObjectSchema = Schema;
