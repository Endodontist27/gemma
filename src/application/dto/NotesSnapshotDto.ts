import type { Bookmark } from '@domain/entities/Bookmark';
import type { Note } from '@domain/entities/Note';

export interface NotesSnapshotDto {
  notes: Note[];
  bookmarks: Bookmark[];
}
