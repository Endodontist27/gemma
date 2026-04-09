import type { Bookmark } from '@domain/entities/Bookmark';
import type { NoteListItemDto } from '@application/dto/NoteListItemDto';

export interface NotesSnapshotDto {
  notes: NoteListItemDto[];
  bookmarks: Bookmark[];
}
