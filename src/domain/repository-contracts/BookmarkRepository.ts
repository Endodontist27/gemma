import type { Bookmark } from '@domain/entities/Bookmark';
import type { BookmarkTargetType } from '@domain/value-objects/KnowledgeEnums';

export interface BookmarkRepository {
  /** Ordered by most recently created first, then stable target order. */
  listBySession(sessionId: string): Promise<Bookmark[]>;
  findByTarget(
    sessionId: string,
    targetType: BookmarkTargetType,
    targetId: string,
  ): Promise<Bookmark | null>;
  save(bookmark: Bookmark): Promise<void>;
  delete(id: string): Promise<void>;
}
