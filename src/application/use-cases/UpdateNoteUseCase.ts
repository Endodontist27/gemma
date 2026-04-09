import type { Note } from '@domain/entities/Note';
import type { NoteRepository } from '@domain/repository-contracts/NoteRepository';
import { nowIso } from '@shared/utils/dates';

export class UpdateNoteUseCase {
  constructor(private readonly noteRepository: NoteRepository) {}

  async execute(note: Note, content: string) {
    const updatedNote: Note = {
      ...note,
      content: content.trim(),
      updatedAt: nowIso(),
    };

    await this.noteRepository.save(updatedNote);
    return updatedNote;
  }
}
