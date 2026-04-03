import { z } from 'zod';

import {
  NonEmptyTextSchema,
  EntityIdSchema,
  IsoDateTimeSchema,
} from '@domain/value-objects/EntityId';

export const MaterialChunkSchema = z.object({
  id: EntityIdSchema,
  sessionId: EntityIdSchema,
  materialId: EntityIdSchema,
  heading: NonEmptyTextSchema,
  text: NonEmptyTextSchema,
  keywords: z.array(NonEmptyTextSchema),
  orderIndex: z.number().int().nonnegative(),
  createdAt: IsoDateTimeSchema,
});

export type MaterialChunk = z.infer<typeof MaterialChunkSchema>;
