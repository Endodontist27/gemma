import type { NoteRepository } from '@domain/repository-contracts/NoteRepository';
import { nowIso } from '@shared/utils/dates';
import { createEntityId } from '@shared/utils/ids';

export class CreateNoteUseCase {
  constructor(private readonly noteRepository: NoteRepository) {}

  async execute(sessionId: string, content: string) {
    const timestamp = nowIso();
    const note = {
      id: createEntityId('note'),
      sessionId,
      content: content.trim(),
      anchorType: 'session' as const,
      anchorId: sessionId,
      pinned: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await this.noteRepository.save(note);
    return note;
  }
}
