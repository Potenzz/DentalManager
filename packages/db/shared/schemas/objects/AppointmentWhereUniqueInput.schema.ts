import { z } from 'zod';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.AppointmentWhereUniqueInput> = z
  .object({
    id: z.number().optional(),
  })
  .strict();

export const AppointmentWhereUniqueInputObjectSchema = Schema;
