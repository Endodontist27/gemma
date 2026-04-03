import { z } from 'zod';

import {
  EntityIdSchema,
  IsoDateTimeSchema,
  NonEmptyTextSchema,
} from '@domain/value-objects/EntityId';

export const QACategorySchema = z.object({
  id: EntityIdSchema,
  sessionId: EntityIdSchema,
  key: NonEmptyTextSchema,
  label: NonEmptyTextSchema,
  description: NonEmptyTextSchema,
  createdAt: IsoDateTimeSchema,
});

export type QACategory = z.infer<typeof QACategorySchema>;
