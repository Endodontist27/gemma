import type { NoteRepository } from '@domain/repository-contracts/NoteRepository';

export class DeleteNoteUseCase {
  constructor(private readonly noteRepository: NoteRepository) {}

  async execute(noteId: string) {
    await this.noteRepository.delete(noteId);
  }
}
