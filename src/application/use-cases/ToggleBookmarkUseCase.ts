import type { ToggleBookmarkResultDto } from '@application/dto/ToggleBookmarkResultDto';
import type { Bookmark } from '@domain/entities/Bookmark';
import type { BookmarkRepository } from '@domain/repository-contracts/BookmarkRepository';
import type { BookmarkTargetType } from '@domain/value-objects/KnowledgeEnums';
import { nowIso } from '@shared/utils/dates';
import { createEntityId } from '@shared/utils/ids';

export class ToggleBookmarkUseCase {
  constructor(private readonly bookmarkRepository: BookmarkRepository) {}

  async execute(
    sessionId: string,
    targetType: BookmarkTargetType,
    targetId: string,
    label: string,
  ): Promise<ToggleBookmarkResultDto> {
    const existing = await this.bookmarkRepository.findByTarget(sessionId, targetType, targetId);

    if (existing) {
      await this.bookmarkRepository.delete(existing.id);
      return {
        isBookmarked: false,
        bookmark: null,
      };
    }

    const bookmark: Bookmark = {
      id: createEntityId('bookmark'),
      sessionId,
      targetType,
      targetId,
      label,
      createdAt: nowIso(),
    };
    await this.bookmarkRepository.save(bookmark);

    return {
      isBookmarked: true,
      bookmark,
    };
  }
}
