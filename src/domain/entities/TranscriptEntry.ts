import { z } from 'zod';

import {
  NonEmptyTextSchema,
  EntityIdSchema,
  IsoDateTimeSchema,
} from '@domain/value-objects/EntityId';

export const TranscriptEntrySchema = z.object({
  id: EntityIdSchema,
  sessionId: EntityIdSchema,
  speakerLabel: NonEmptyTextSchema,
  text: NonEmptyTextSchema,
  startedAtSeconds: z.number().nonnegative(),
  orderIndex: z.number().int().nonnegative(),
  createdAt: IsoDateTimeSchema,
});

export type TranscriptEntry = z.infer<typeof TranscriptEntrySchema>;
