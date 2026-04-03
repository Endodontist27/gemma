import type { NotesSnapshotDto } from '@application/dto/NotesSnapshotDto';
import type { BookmarkRepository } from '@domain/repository-contracts/BookmarkRepository';
import type { NoteRepository } from '@domain/repository-contracts/NoteRepository';

export class ListNotesUseCase {
  constructor(
    private readonly noteRepository: NoteRepository,
    private readonly bookmarkRepository: BookmarkRepository,
  ) {}

  async execute(sessionId: string): Promise<NotesSnapshotDto> {
    const [notes, bookmarks] = await Promise.all([
      this.noteRepository.listBySession(sessionId),
      this.bookmarkRepository.listBySession(sessionId),
    ]);

    return {
      notes,
      bookmarks,
    };
  }
}
