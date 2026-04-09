import { describe, expect, it, vi } from 'vitest';

import { DeleteNoteUseCase } from '@application/use-cases/DeleteNoteUseCase';
import type { NoteRepository } from '@domain/repository-contracts/NoteRepository';

const createRepository = (): NoteRepository => ({
  listBySession: vi.fn(),
  save: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
});

describe('DeleteNoteUseCase', () => {
  it('deletes the targeted note id', async () => {
    const repository = createRepository();
    const useCase = new DeleteNoteUseCase(repository);

    await useCase.execute('note_demo');

    expect(repository.delete).toHaveBeenCalledWith('note_demo');
  });
});
