import { z } from 'zod';
import { PatientWhereUniqueInputObjectSchema } from './PatientWhereUniqueInput.schema';
import { PatientCreateWithoutUserInputObjectSchema } from './PatientCreateWithoutUserInput.schema';
import { PatientUncheckedCreateWithoutUserInputObjectSchema } from './PatientUncheckedCreateWithoutUserInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.PatientCreateOrConnectWithoutUserInput> = z
  .object({
    where: z.lazy(() => PatientWhereUniqueInputObjectSchema),
    create: z.union([
      z.lazy(() => PatientCreateWithoutUserInputObjectSchema),
      z.lazy(() => PatientUncheckedCreateWithoutUserInputObjectSchema),
    ]),
  })
  .strict();

export const PatientCreateOrConnectWithoutUserInputObjectSchema = Schema;
