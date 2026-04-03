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
  ) {
    const existing = await this.bookmarkRepository.findByTarget(sessionId, targetType, targetId);

    if (existing) {
      await this.bookmarkRepository.delete(existing.id);
      return false;
    }

    await this.bookmarkRepository.save({
      id: createEntityId('bookmark'),
      sessionId,
      targetType,
      targetId,
      label,
      createdAt: nowIso(),
    });

    return true;
  }
}
