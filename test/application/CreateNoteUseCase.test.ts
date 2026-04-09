import { describe, expect, it, vi } from 'vitest';

import { CreateNoteUseCase } from '@application/use-cases/CreateNoteUseCase';
import type { Note } from '@domain/entities/Note';

describe('CreateNoteUseCase', () => {
  it('creates a session note by default', async () => {
    const savedNotes: Note[] = [];
    const useCase = new CreateNoteUseCase({
      listBySession: async () => [],
      save: async (note) => {
        savedNotes.push(note);
      },
      delete: async () => undefined,
    });

    const result = await useCase.execute('session_demo', '  Session reminder  ');

    expect(result.anchorType).toBe('session');
    expect(result.anchorId).toBe('session_demo');
    expect(result.content).toBe('Session reminder');
    expect(savedNotes[0]?.anchorType).toBe('session');
  });

  it('creates an anchored glossary note when anchor metadata is provided', async () => {
    const save = vi.fn(async () => undefined);
    const useCase = new CreateNoteUseCase({
      listBySession: async () => [],
      save,
      delete: async () => undefined,
    });

    const result = await useCase.execute('session_demo', 'Important definition', {
      anchorType: 'glossary_term',
      anchorId: 'glossary_working_length',
    });

    expect(result.anchorType).toBe('glossary_term');
    expect(result.anchorId).toBe('glossary_working_length');
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        anchorType: 'glossary_term',
        anchorId: 'glossary_working_length',
      }),
    );
  });
});
