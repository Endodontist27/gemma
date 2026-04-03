import { z } from 'zod';

import {
  NonEmptyTextSchema,
  EntityIdSchema,
  IsoDateTimeSchema,
} from '@domain/value-objects/EntityId';
import { SummaryKindSchema } from '@domain/value-objects/LectureEnums';

export const SummarySchema = z.object({
  id: EntityIdSchema,
  sessionId: EntityIdSchema,
  kind: SummaryKindSchema,
  title: NonEmptyTextSchema,
  text: NonEmptyTextSchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export type Summary = z.infer<typeof SummarySchema>;
