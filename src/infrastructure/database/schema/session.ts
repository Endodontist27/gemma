import { sql } from 'drizzle-orm';
import { check, index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const lectureSessions = sqliteTable(
  'lecture_sessions',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    courseCode: text('course_code').notNull(),
    lecturer: text('lecturer').notNull(),
    description: text('description').notNull(),
    location: text('location').notNull(),
    startsAt: text('starts_at').notNull(),
    status: text('status').notNull(),
    sourcePackVersion: text('source_pack_version').notNull(),
    tagsJson: text('tags_json').notNull().default('[]'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('lecture_sessions_starts_at_idx').on(table.startsAt),
    check('lecture_sessions_status_check', sql`${table.status} in ('scheduled', 'live', 'ended')`),
  ],
);
