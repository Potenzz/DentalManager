import { z } from 'zod';
import { SortOrderSchema } from '../enums/SortOrder.schema';
import { NullsOrderSchema } from '../enums/NullsOrder.schema';

import type { Prisma } from '../../../generated/prisma';

const Schema: z.ZodType<Prisma.SortOrderInput> = z
  .object({
    sort: z.lazy(() => SortOrderSchema),
    nulls: z.lazy(() => NullsOrderSchema).optional(),
  })
  .strict();

export const SortOrderInputObjectSchema = Schema;
