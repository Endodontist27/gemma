import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { lectureSessions } from '@infrastructure/database/schema/session';

export const lectureMaterials = sqliteTable(
  'lecture_materials',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => lectureSessions.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    type: text('type').notNull(),
    sourceLabel: text('source_label').notNull(),
    contentText: text('content_text').notNull(),
    orderIndex: integer('order_index').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('lecture_materials_session_idx').on(table.sessionId, table.orderIndex),
    check(
      'lecture_materials_type_check',
      sql`${table.type} in ('slide_deck', 'handout', 'reading', 'code_sample')`,
    ),
  ],
);

export const materialChunks = sqliteTable(
  'material_chunks',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => lectureSessions.id, { onDelete: 'cascade' }),
    materialId: text('material_id')
      .notNull()
      .references(() => lectureMaterials.id, { onDelete: 'cascade' }),
    heading: text('heading').notNull(),
    text: text('text').notNull(),
    keywordsJson: text('keywords_json').notNull().default('[]'),
    orderIndex: integer('order_index').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('material_chunks_material_idx').on(table.materialId, table.orderIndex),
    index('material_chunks_session_idx').on(table.sessionId),
  ],
);

export const glossaryTerms = sqliteTable(
  'glossary_terms',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => lectureSessions.id, { onDelete: 'cascade' }),
    term: text('term').notNull(),
    aliasesJson: text('aliases_json').notNull().default('[]'),
    definition: text('definition').notNull(),
    orderIndex: integer('order_index').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('glossary_terms_session_idx').on(table.sessionId, table.orderIndex),
    uniqueIndex('glossary_terms_session_term_idx').on(table.sessionId, table.term),
  ],
);

export const transcriptEntries = sqliteTable(
  'transcript_entries',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => lectureSessions.id, { onDelete: 'cascade' }),
    speakerLabel: text('speaker_label').notNull(),
    text: text('text').notNull(),
    startedAtSeconds: integer('started_at_seconds').notNull(),
    orderIndex: integer('order_index').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('transcript_entries_session_idx').on(table.sessionId, table.orderIndex)],
);

export const summaries = sqliteTable(
  'summaries',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => lectureSessions.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    title: text('title').notNull(),
    text: text('text').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('summaries_session_kind_idx').on(table.sessionId, table.kind),
    check('summaries_kind_check', sql`${table.kind} in ('overview', 'key_points', 'exam_focus')`),
  ],
);
