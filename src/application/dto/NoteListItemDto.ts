import type { Note } from '@domain/entities/Note';

export interface NoteListItemDto {
  note: Note;
  anchorLabel: string;
  anchorTypeLabel: string;
}
