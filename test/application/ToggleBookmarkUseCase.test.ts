import { describe, expect, it, vi } from 'vitest';

import { ToggleBookmarkUseCase } from '@application/use-cases/ToggleBookmarkUseCase';
import type { Bookmark } from '@domain/entities/Bookmark';
import type { BookmarkRepository } from '@domain/repository-contracts/BookmarkRepository';

const createRepository = (existingBookmark: Bookmark | null): BookmarkRepository => ({
  listBySession: vi.fn(),
  findByTarget: vi.fn().mockResolvedValue(existingBookmark),
  save: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
});

describe('ToggleBookmarkUseCase', () => {
  it('returns the created bookmark when a target becomes bookmarked', async () => {
    const repository = createRepository(null);
    const useCase = new ToggleBookmarkUseCase(repository);

    const result = await useCase.execute(
      'session_demo',
      'material_chunk',
      'chunk_1',
      'Offline-first chunk',
    );

    expect(result.isBookmarked).toBe(true);
    expect(result.bookmark).toMatchObject({
      sessionId: 'session_demo',
      targetType: 'material_chunk',
      targetId: 'chunk_1',
      label: 'Offline-first chunk',
    });
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('returns a null bookmark when a target is unbookmarked', async () => {
    const existingBookmark: Bookmark = {
      id: 'bookmark_1',
      sessionId: 'session_demo',
      targetType: 'glossary_term',
      targetId: 'term_1',
      label: 'RAG',
      createdAt: '2026-04-03T09:00:00.000Z',
    };
    const repository = createRepository(existingBookmark);
    const useCase = new ToggleBookmarkUseCase(repository);

    const result = await useCase.execute('session_demo', 'glossary_term', 'term_1', 'RAG');

    expect(result.isBookmarked).toBe(false);
    expect(result.bookmark).toBeNull();
    expect(repository.delete).toHaveBeenCalledWith('bookmark_1');
    expect(repository.save).not.toHaveBeenCalled();
  });
});
