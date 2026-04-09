import { and, asc, desc, eq } from 'drizzle-orm';

import type { Bookmark } from '@domain/entities/Bookmark';
import type { BookmarkRepository } from '@domain/repository-contracts/BookmarkRepository';
import type { BookmarkTargetType } from '@domain/value-objects/KnowledgeEnums';
import type { AppDatabaseExecutor } from '@infrastructure/database/client';
import { mapBookmarkRecord, toBookmarkInsert } from '@infrastructure/database/mappers';
import { bookmarks } from '@infrastructure/database/schema';

export class DrizzleBookmarkRepository implements BookmarkRepository {
  constructor(private readonly db: AppDatabaseExecutor) {}

  async listBySession(sessionId: string) {
    const rows = await this.db
      .select()
      .from(bookmarks)
      .where(eq(bookmarks.sessionId, sessionId))
      .orderBy(
        desc(bookmarks.createdAt),
        asc(bookmarks.targetType),
        asc(bookmarks.targetId),
        asc(bookmarks.id),
      );

    return rows.map(mapBookmarkRecord);
  }

  async findByTarget(sessionId: string, targetType: BookmarkTargetType, targetId: string) {
    const rows = await this.db
      .select()
      .from(bookmarks)
      .where(
        and(
          eq(bookmarks.sessionId, sessionId),
          eq(bookmarks.targetType, targetType),
          eq(bookmarks.targetId, targetId),
        ),
      )
      .limit(1);
    const row = rows[0];

    return row ? mapBookmarkRecord(row) : null;
  }

  async save(bookmark: Bookmark) {
    await this.db
      .insert(bookmarks)
      .values(toBookmarkInsert(bookmark))
      .onConflictDoUpdate({
        target: bookmarks.id,
        set: {
          sessionId: bookmark.sessionId,
          targetType: bookmark.targetType,
          targetId: bookmark.targetId,
          label: bookmark.label,
          createdAt: bookmark.createdAt,
        },
      })
      .run();
  }

  async delete(id: string) {
    await this.db.delete(bookmarks).where(eq(bookmarks.id, id)).run();
  }
}
