import type { Note } from '@domain/entities/Note';

export interface NoteRepository {
  /** Ordered by pinned notes first, then most recently updated. */
  listBySession(sessionId: string): Promise<Note[]>;
  save(note: Note): Promise<void>;
}
