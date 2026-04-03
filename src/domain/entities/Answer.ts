import { z } from 'zod';

import {
  EntityIdSchema,
  IsoDateTimeSchema,
  NonEmptyTextSchema,
} from '@domain/value-objects/EntityId';
import { AnswerStateSchema } from '@domain/value-objects/QuestionEnums';

export const AnswerSchema = z.object({
  id: EntityIdSchema,
  questionId: EntityIdSchema,
  sessionId: EntityIdSchema,
  text: NonEmptyTextSchema,
  state: AnswerStateSchema,
  confidenceScore: z.number().min(0).max(1),
  createdAt: IsoDateTimeSchema,
});

export type Answer = z.infer<typeof AnswerSchema>;
