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
    const rows = await this.db.query.bookmarks.findMany({
      where: eq(bookmarks.sessionId, sessionId),
      orderBy: [
        desc(bookmarks.createdAt),
        asc(bookmarks.targetType),
        asc(bookmarks.targetId),
        asc(bookmarks.id),
      ],
    });

    return rows.map(mapBookmarkRecord);
  }

  async findByTarget(sessionId: string, targetType: BookmarkTargetType, targetId: string) {
    const row = await this.db.query.bookmarks.findFirst({
      where: and(
        eq(bookmarks.sessionId, sessionId),
        eq(bookmarks.targetType, targetType),
        eq(bookmarks.targetId, targetId),
      ),
    });

    return row ? mapBookmarkRecord(row) : null;
  }

  async save(bookmark: Bookmark) {
    await this.db.insert(bookmarks).values(toBookmarkInsert(bookmark));
  }

  async delete(id: string) {
    await this.db.delete(bookmarks).where(eq(bookmarks.id, id));
  }
}
