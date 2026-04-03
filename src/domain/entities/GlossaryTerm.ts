import { z } from 'zod';

import {
  NonEmptyTextSchema,
  EntityIdSchema,
  IsoDateTimeSchema,
} from '@domain/value-objects/EntityId';

export const GlossaryTermSchema = z.object({
  id: EntityIdSchema,
  sessionId: EntityIdSchema,
  term: NonEmptyTextSchema,
  aliases: z.array(NonEmptyTextSchema),
  definition: NonEmptyTextSchema,
  orderIndex: z.number().int().nonnegative(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export type GlossaryTerm = z.infer<typeof GlossaryTermSchema>;
