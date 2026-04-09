import { describe, expect, it, vi } from 'vitest';

import { UpdateNoteUseCase } from '@application/use-cases/UpdateNoteUseCase';
import type { Note } from '@domain/entities/Note';
import type { NoteRepository } from '@domain/repository-contracts/NoteRepository';

const baseNote: Note = {
  id: 'note_demo',
  sessionId: 'session_demo',
  content: 'Original note',
  anchorType: 'session',
  anchorId: 'session_demo',
  pinned: false,
  createdAt: '2026-04-03T09:00:00.000Z',
  updatedAt: '2026-04-03T09:00:00.000Z',
};

const createRepository = (): NoteRepository => ({
  listBySession: vi.fn(),
  save: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
});

describe('UpdateNoteUseCase', () => {
  it('updates note content and refreshes the updatedAt timestamp', async () => {
    const repository = createRepository();
    const useCase = new UpdateNoteUseCase(repository);

    const result = await useCase.execute(baseNote, '  Revised note content  ');

    expect(result).toMatchObject({
      id: baseNote.id,
      sessionId: baseNote.sessionId,
      content: 'Revised note content',
      anchorType: baseNote.anchorType,
      anchorId: baseNote.anchorId,
      pinned: baseNote.pinned,
      createdAt: baseNote.createdAt,
    });
    expect(result.updatedAt).not.toBe(baseNote.updatedAt);
    expect(repository.save).toHaveBeenCalledWith(result);
  });
});
