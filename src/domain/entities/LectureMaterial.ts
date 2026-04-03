import { z } from 'zod';

import {
  NonEmptyTextSchema,
  EntityIdSchema,
  IsoDateTimeSchema,
} from '@domain/value-objects/EntityId';
import { LectureMaterialTypeSchema } from '@domain/value-objects/LectureEnums';

export const LectureMaterialSchema = z.object({
  id: EntityIdSchema,
  sessionId: EntityIdSchema,
  title: NonEmptyTextSchema,
  type: LectureMaterialTypeSchema,
  sourceLabel: NonEmptyTextSchema,
  contentText: NonEmptyTextSchema,
  orderIndex: z.number().int().nonnegative(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export type LectureMaterial = z.infer<typeof LectureMaterialSchema>;
