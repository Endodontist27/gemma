import type { NoteRepository } from '@domain/repository-contracts/NoteRepository';
import type { NoteAnchorType } from '@domain/value-objects/KnowledgeEnums';
import { nowIso } from '@shared/utils/dates';
import { createEntityId } from '@shared/utils/ids';

export interface CreateNoteAnchorInput {
  anchorType: NoteAnchorType;
  anchorId: string | null;
}

export class CreateNoteUseCase {
  constructor(private readonly noteRepository: NoteRepository) {}

  async execute(sessionId: string, content: string, anchor?: CreateNoteAnchorInput) {
    const timestamp = nowIso();
    const anchorType = anchor?.anchorType ?? 'session';
    const anchorId =
      anchorType === 'session' ? (anchor?.anchorId ?? sessionId) : anchor?.anchorId ?? null;

    if (anchorType !== 'session' && !anchorId) {
      throw new Error('Anchored notes require a source id.');
    }

    const note = {
      id: createEntityId('note'),
      sessionId,
      content: content.trim(),
      anchorType,
      anchorId,
      pinned: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await this.noteRepository.save(note);
    return note;
  }
}
