import { z } from 'zod';

import {
  EntityIdSchema,
  IsoDateTimeSchema,
  NonEmptyTextSchema,
} from '@domain/value-objects/EntityId';
import { BookmarkTargetTypeSchema } from '@domain/value-objects/KnowledgeEnums';

export const BookmarkSchema = z.object({
  id: EntityIdSchema,
  sessionId: EntityIdSchema,
  targetType: BookmarkTargetTypeSchema,
  targetId: EntityIdSchema,
  label: NonEmptyTextSchema,
  createdAt: IsoDateTimeSchema,
});

export type Bookmark = z.infer<typeof BookmarkSchema>;
