import { z } from 'zod';

import {
  EntityIdSchema,
  IsoDateTimeSchema,
  NonEmptyTextSchema,
} from '@domain/value-objects/EntityId';
import {
  LectureMaterialTypeSchema,
  LectureSessionStatusSchema,
  SummaryKindSchema,
} from '@domain/value-objects/LectureEnums';
import { AnswerSourceTypeSchema } from '@domain/value-objects/KnowledgeEnums';

const LecturePackChunkSchema = z.object({
  id: EntityIdSchema,
  heading: NonEmptyTextSchema,
  text: NonEmptyTextSchema,
  keywords: z.array(NonEmptyTextSchema).default([]),
  orderIndex: z.number().int().nonnegative(),
});

const LecturePackMaterialSchema = z.object({
  id: EntityIdSchema,
  title: NonEmptyTextSchema,
  type: LectureMaterialTypeSchema,
  sourceLabel: NonEmptyTextSchema,
  contentText: NonEmptyTextSchema,
  orderIndex: z.number().int().nonnegative(),
  chunks: z.array(LecturePackChunkSchema),
});

const LecturePackGlossaryTermSchema = z.object({
  id: EntityIdSchema,
  term: NonEmptyTextSchema,
  aliases: z.array(NonEmptyTextSchema).default([]),
  definition: NonEmptyTextSchema,
  orderIndex: z.number().int().nonnegative(),
});

const LecturePackTranscriptEntrySchema = z.object({
  id: EntityIdSchema,
  speakerLabel: NonEmptyTextSchema,
  text: NonEmptyTextSchema,
  startedAtSeconds: z.number().nonnegative(),
  orderIndex: z.number().int().nonnegative(),
});

const LecturePackSummarySchema = z.object({
  id: EntityIdSchema,
  kind: SummaryKindSchema,
  title: NonEmptyTextSchema,
  text: NonEmptyTextSchema,
});

const LecturePackCategorySchema = z.object({
  id: EntityIdSchema,
  key: NonEmptyTextSchema,
  label: NonEmptyTextSchema,
  description: NonEmptyTextSchema,
});

const LecturePackSourceReferenceSchema = z.object({
  sourceType: AnswerSourceTypeSchema,
  sourceId: EntityIdSchema,
});

const LecturePackPublicQaSchema = z.object({
  id: EntityIdSchema,
  categoryKey: NonEmptyTextSchema,
  questionText: NonEmptyTextSchema,
  askedAt: IsoDateTimeSchema,
  answer: z.object({
    id: EntityIdSchema,
    text: NonEmptyTextSchema,
    confidenceScore: z.number().min(0).max(1),
    sources: z.array(LecturePackSourceReferenceSchema).min(1),
  }),
});

export const LecturePackDtoSchema = z.object({
  packVersion: z.literal('1.0.0'),
  exportedAt: IsoDateTimeSchema,
  session: z.object({
    id: EntityIdSchema,
    title: NonEmptyTextSchema,
    courseCode: NonEmptyTextSchema,
    lecturer: NonEmptyTextSchema,
    description: NonEmptyTextSchema,
    location: NonEmptyTextSchema,
    startsAt: IsoDateTimeSchema,
    status: LectureSessionStatusSchema,
    tags: z.array(NonEmptyTextSchema).default([]),
  }),
  materials: z.array(LecturePackMaterialSchema).min(1),
  glossary: z.array(LecturePackGlossaryTermSchema).default([]),
  transcript: z.array(LecturePackTranscriptEntrySchema).default([]),
  summaries: z.array(LecturePackSummarySchema).default([]),
  qaCategories: z.array(LecturePackCategorySchema).default([]),
  publicQa: z.array(LecturePackPublicQaSchema).default([]),
});

export type LecturePackDto = z.infer<typeof LecturePackDtoSchema>;
