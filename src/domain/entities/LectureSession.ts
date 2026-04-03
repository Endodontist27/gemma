import { z } from 'zod';

import {
  NonEmptyTextSchema,
  EntityIdSchema,
  IsoDateTimeSchema,
} from '@domain/value-objects/EntityId';
import { LectureSessionStatusSchema } from '@domain/value-objects/LectureEnums';

export const LectureSessionSchema = z.object({
  id: EntityIdSchema,
  title: NonEmptyTextSchema,
  courseCode: NonEmptyTextSchema,
  lecturer: NonEmptyTextSchema,
  description: NonEmptyTextSchema,
  location: NonEmptyTextSchema,
  startsAt: IsoDateTimeSchema,
  status: LectureSessionStatusSchema,
  sourcePackVersion: NonEmptyTextSchema,
  tags: z.array(NonEmptyTextSchema),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export type LectureSession = z.infer<typeof LectureSessionSchema>;
