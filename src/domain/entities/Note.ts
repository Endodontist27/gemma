import { z } from 'zod';

import {
  EntityIdSchema,
  IsoDateTimeSchema,
  NonEmptyTextSchema,
} from '@domain/value-objects/EntityId';
import { NoteAnchorTypeSchema } from '@domain/value-objects/KnowledgeEnums';

export const NoteSchema = z.object({
  id: EntityIdSchema,
  sessionId: EntityIdSchema,
  content: NonEmptyTextSchema,
  anchorType: NoteAnchorTypeSchema,
  anchorId: EntityIdSchema.nullable(),
  pinned: z.boolean(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export type Note = z.infer<typeof NoteSchema>;
