import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { lectureSessions } from '@infrastructure/database/schema/session';

export const notes = sqliteTable(
  'notes',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => lectureSessions.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    anchorType: text('anchor_type').notNull(),
    anchorId: text('anchor_id'),
    pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('notes_session_idx').on(table.sessionId, table.updatedAt),
    check(
      'notes_anchor_type_check',
      sql`${table.anchorType} in ('session', 'lecture_material', 'material_chunk', 'glossary_term', 'transcript_entry', 'evidence_unit')`,
    ),
  ],
);

export const bookmarks = sqliteTable(
  'bookmarks',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => lectureSessions.id, { onDelete: 'cascade' }),
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    label: text('label').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('bookmarks_session_target_idx').on(
      table.sessionId,
      table.targetType,
      table.targetId,
    ),
    index('bookmarks_session_idx').on(table.sessionId),
    check(
      'bookmarks_target_type_check',
      sql`${table.targetType} in ('lecture_material', 'material_chunk', 'glossary_term', 'transcript_entry', 'evidence_unit')`,
    ),
  ],
);
