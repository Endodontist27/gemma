import { z } from 'zod';

import {
  EntityIdSchema,
  IsoDateTimeSchema,
  NonEmptyTextSchema,
} from '@domain/value-objects/EntityId';
import {
  QuestionOriginSchema,
  QuestionStatusSchema,
  QuestionVisibilitySchema,
} from '@domain/value-objects/QuestionEnums';

export const QuestionSchema = z.object({
  id: EntityIdSchema,
  sessionId: EntityIdSchema,
  categoryId: EntityIdSchema.nullable(),
  text: NonEmptyTextSchema,
  normalizedText: NonEmptyTextSchema,
  status: QuestionStatusSchema,
  visibility: QuestionVisibilitySchema,
  origin: QuestionOriginSchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export type Question = z.infer<typeof QuestionSchema>;
