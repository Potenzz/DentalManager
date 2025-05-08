import { z } from 'zod';
import { PatientWhereUniqueInputObjectSchema } from './PatientWhereUniqueInput.schema';
import { PatientUpdateWithoutUserInputObjectSchema } from './PatientUpdateWithoutUserInput.schema';
import { PatientUncheckedUpdateWithoutUserInputObjectSchema } from './PatientUncheckedUpdateWithoutUserInput.schema';
import { PatientCreateWithoutUserInputObjectSchema } from './PatientCreateWithoutUserInput.schema';
import { PatientUncheckedCreateWithoutUserInputObjectSchema } from './PatientUncheckedCreateWithoutUserInput.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.PatientUpsertWithWhereUniqueWithoutUserInput> = z
  .object({
    where: z.lazy(() => PatientWhereUniqueInputObjectSchema),
    update: z.union([
      z.lazy(() => PatientUpdateWithoutUserInputObjectSchema),
      z.lazy(() => PatientUncheckedUpdateWithoutUserInputObjectSchema),
    ]),
    create: z.union([
      z.lazy(() => PatientCreateWithoutUserInputObjectSchema),
      z.lazy(() => PatientUncheckedCreateWithoutUserInputObjectSchema),
    ]),
  })
  .strict();

export const PatientUpsertWithWhereUniqueWithoutUserInputObjectSchema = Schema;
