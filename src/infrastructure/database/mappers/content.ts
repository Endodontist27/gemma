import { GlossaryTermSchema, type GlossaryTerm } from '@domain/entities/GlossaryTerm';
import { LectureMaterialSchema, type LectureMaterial } from '@domain/entities/LectureMaterial';
import { MaterialChunkSchema, type MaterialChunk } from '@domain/entities/MaterialChunk';
import { SummarySchema, type Summary } from '@domain/entities/Summary';
import { TranscriptEntrySchema, type TranscriptEntry } from '@domain/entities/TranscriptEntry';
import {
  glossaryTerms,
  lectureMaterials,
  materialChunks,
  summaries,
  transcriptEntries,
} from '@infrastructure/database/schema';
import { deserializeStringArray, serializeStringArray } from '@infrastructure/database/serializers';

export const mapLectureMaterialRecord = (
  record: typeof lectureMaterials.$inferSelect,
): LectureMaterial =>
  LectureMaterialSchema.parse({
    id: record.id,
    sessionId: record.sessionId,
    title: record.title,
    type: record.type,
    sourceLabel: record.sourceLabel,
    contentText: record.contentText,
    orderIndex: record.orderIndex,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });

export const toLectureMaterialInsert = (
  entity: LectureMaterial,
): typeof lectureMaterials.$inferInsert => ({
  id: entity.id,
  sessionId: entity.sessionId,
  title: entity.title,
  type: entity.type,
  sourceLabel: entity.sourceLabel,
  contentText: entity.contentText,
  orderIndex: entity.orderIndex,
  createdAt: entity.createdAt,
  updatedAt: entity.updatedAt,
});

export const mapMaterialChunkRecord = (record: typeof materialChunks.$inferSelect): MaterialChunk =>
  MaterialChunkSchema.parse({
    id: record.id,
    sessionId: record.sessionId,
    materialId: record.materialId,
    heading: record.heading,
    text: record.text,
    keywords: deserializeStringArray(record.keywordsJson),
    orderIndex: record.orderIndex,
    createdAt: record.createdAt,
  });

export const toMaterialChunkInsert = (
  entity: MaterialChunk,
): typeof materialChunks.$inferInsert => ({
  id: entity.id,
  sessionId: entity.sessionId,
  materialId: entity.materialId,
  heading: entity.heading,
  text: entity.text,
  keywordsJson: serializeStringArray(entity.keywords),
  orderIndex: entity.orderIndex,
  createdAt: entity.createdAt,
});

export const mapGlossaryTermRecord = (record: typeof glossaryTerms.$inferSelect): GlossaryTerm =>
  GlossaryTermSchema.parse({
    id: record.id,
    sessionId: record.sessionId,
    term: record.term,
    aliases: deserializeStringArray(record.aliasesJson),
    definition: record.definition,
    orderIndex: record.orderIndex,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });

export const toGlossaryTermInsert = (entity: GlossaryTerm): typeof glossaryTerms.$inferInsert => ({
  id: entity.id,
  sessionId: entity.sessionId,
  term: entity.term,
  aliasesJson: serializeStringArray(entity.aliases),
  definition: entity.definition,
  orderIndex: entity.orderIndex,
  createdAt: entity.createdAt,
  updatedAt: entity.updatedAt,
});

export const mapTranscriptEntryRecord = (
  record: typeof transcriptEntries.$inferSelect,
): TranscriptEntry =>
  TranscriptEntrySchema.parse({
    id: record.id,
    sessionId: record.sessionId,
    speakerLabel: record.speakerLabel,
    text: record.text,
    startedAtSeconds: record.startedAtSeconds,
    orderIndex: record.orderIndex,
    createdAt: record.createdAt,
  });

export const toTranscriptEntryInsert = (
  entity: TranscriptEntry,
): typeof transcriptEntries.$inferInsert => ({
  id: entity.id,
  sessionId: entity.sessionId,
  speakerLabel: entity.speakerLabel,
  text: entity.text,
  startedAtSeconds: entity.startedAtSeconds,
  orderIndex: entity.orderIndex,
  createdAt: entity.createdAt,
});

export const mapSummaryRecord = (record: typeof summaries.$inferSelect): Summary =>
  SummarySchema.parse({
    id: record.id,
    sessionId: record.sessionId,
    kind: record.kind,
    title: record.title,
    text: record.text,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });

export const toSummaryInsert = (entity: Summary): typeof summaries.$inferInsert => ({
  id: entity.id,
  sessionId: entity.sessionId,
  kind: entity.kind,
  title: entity.title,
  text: entity.text,
  createdAt: entity.createdAt,
  updatedAt: entity.updatedAt,
});
