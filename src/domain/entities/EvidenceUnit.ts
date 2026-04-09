import { z } from 'zod';

import {
  EntityIdSchema,
  IsoDateTimeSchema,
  NonEmptyTextSchema,
} from '@domain/value-objects/EntityId';

export const EvidenceUnitModalitySchema = z.enum([
  'text',
  'image',
  'video',
  'pdf',
  'slide',
]);
export type EvidenceUnitModality = z.infer<typeof EvidenceUnitModalitySchema>;

export const EvidenceUnitSchema = z.object({
  id: EntityIdSchema,
  sessionId: EntityIdSchema,
  assetId: EntityIdSchema,
  sourceType: z.enum(['material_chunk', 'glossary_term', 'transcript_entry', 'asset']),
  sourceRecordId: EntityIdSchema.nullable(),
  modality: EvidenceUnitModalitySchema,
  title: NonEmptyTextSchema,
  excerpt: NonEmptyTextSchema,
  contentText: NonEmptyTextSchema,
  searchText: NonEmptyTextSchema,
  pageNumber: z.number().int().positive().nullable(),
  slideNumber: z.number().int().positive().nullable(),
  frameLabel: z.string().nullable(),
  timestampStartSeconds: z.number().nonnegative().nullable(),
  timestampEndSeconds: z.number().nonnegative().nullable(),
  previewUri: z.string().nullable(),
  metadataJson: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
});

export type EvidenceUnit = z.infer<typeof EvidenceUnitSchema>;
