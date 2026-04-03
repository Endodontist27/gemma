import { BookmarkSchema, type Bookmark } from '@domain/entities/Bookmark';
import { NoteSchema, type Note } from '@domain/entities/Note';
import { bookmarks, notes } from '@infrastructure/database/schema';

export const mapNoteRecord = (record: typeof notes.$inferSelect): Note =>
  NoteSchema.parse({
    id: record.id,
    sessionId: record.sessionId,
    content: record.content,
    anchorType: record.anchorType,
    anchorId: record.anchorId,
    pinned: record.pinned,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });

export const toNoteInsert = (entity: Note): typeof notes.$inferInsert => ({
  id: entity.id,
  sessionId: entity.sessionId,
  content: entity.content,
  anchorType: entity.anchorType,
  anchorId: entity.anchorId,
  pinned: entity.pinned,
  createdAt: entity.createdAt,
  updatedAt: entity.updatedAt,
});

export const mapBookmarkRecord = (record: typeof bookmarks.$inferSelect): Bookmark =>
  BookmarkSchema.parse({
    id: record.id,
    sessionId: record.sessionId,
    targetType: record.targetType,
    targetId: record.targetId,
    label: record.label,
    createdAt: record.createdAt,
  });

export const toBookmarkInsert = (entity: Bookmark): typeof bookmarks.$inferInsert => ({
  id: entity.id,
  sessionId: entity.sessionId,
  targetType: entity.targetType,
  targetId: entity.targetId,
  label: entity.label,
  createdAt: entity.createdAt,
});
