import { z } from 'zod';

import {
  EntityIdSchema,
  IsoDateTimeSchema,
  NonEmptyTextSchema,
} from '@domain/value-objects/EntityId';
import { AnswerSourceTypeSchema } from '@domain/value-objects/KnowledgeEnums';

export const AnswerSourceSchema = z.object({
  id: EntityIdSchema,
  answerId: EntityIdSchema,
  sessionId: EntityIdSchema,
  sourceType: AnswerSourceTypeSchema,
  sourceRecordId: EntityIdSchema,
  label: NonEmptyTextSchema,
  excerpt: NonEmptyTextSchema,
  relevanceScore: z.number().nonnegative(),
  createdAt: IsoDateTimeSchema,
});

export type AnswerSource = z.infer<typeof AnswerSourceSchema>;
