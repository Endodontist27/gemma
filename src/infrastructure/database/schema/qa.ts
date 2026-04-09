import { sql } from 'drizzle-orm';
import { check, index, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { lectureSessions } from '@infrastructure/database/schema/session';

export const qaCategories = sqliteTable(
  'qa_categories',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => lectureSessions.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    label: text('label').notNull(),
    description: text('description').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('qa_categories_session_key_idx').on(table.sessionId, table.key),
    index('qa_categories_session_idx').on(table.sessionId),
  ],
);

export const questions = sqliteTable(
  'questions',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => lectureSessions.id, { onDelete: 'cascade' }),
    categoryId: text('category_id').references(() => qaCategories.id, { onDelete: 'set null' }),
    text: text('text').notNull(),
    normalizedText: text('normalized_text').notNull(),
    status: text('status').notNull(),
    visibility: text('visibility').notNull(),
    origin: text('origin').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('questions_session_idx').on(table.sessionId, table.createdAt),
    index('questions_session_visibility_idx').on(table.sessionId, table.visibility),
    index('questions_normalized_text_idx').on(table.normalizedText),
    check('questions_status_check', sql`${table.status} in ('supported', 'unsupported')`),
    check('questions_visibility_check', sql`${table.visibility} in ('public', 'private')`),
    check('questions_origin_check', sql`${table.origin} in ('seed_public', 'user_local')`),
  ],
);

export const answers = sqliteTable(
  'answers',
  {
    id: text('id').primaryKey(),
    questionId: text('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    sessionId: text('session_id')
      .notNull()
      .references(() => lectureSessions.id, { onDelete: 'cascade' }),
    text: text('text').notNull(),
    state: text('state').notNull(),
    confidenceScore: real('confidence_score').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('answers_question_idx').on(table.questionId),
    index('answers_session_idx').on(table.sessionId),
    check('answers_state_check', sql`${table.state} in ('grounded', 'unsupported')`),
    check(
      'answers_confidence_check',
      sql`${table.confidenceScore} >= 0 and ${table.confidenceScore} <= 1`,
    ),
  ],
);

export const answerSources = sqliteTable(
  'answer_sources',
  {
    id: text('id').primaryKey(),
    answerId: text('answer_id')
      .notNull()
      .references(() => answers.id, { onDelete: 'cascade' }),
    sessionId: text('session_id')
      .notNull()
      .references(() => lectureSessions.id, { onDelete: 'cascade' }),
    sourceType: text('source_type').notNull(),
    sourceRecordId: text('source_record_id').notNull(),
    label: text('label').notNull(),
    excerpt: text('excerpt').notNull(),
    relevanceScore: real('relevance_score').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('answer_sources_answer_idx').on(table.answerId),
    index('answer_sources_session_idx').on(table.sessionId),
    check(
      'answer_sources_type_check',
      sql`${table.sourceType} in ('glossary_term', 'material_chunk', 'transcript_entry', 'evidence_unit')`,
    ),
  ],
);
