import type { Bookmark } from '@domain/entities/Bookmark';
import type { Note } from '@domain/entities/Note';
import type { NoteListItemDto } from '@application/dto/NoteListItemDto';

export const sortBookmarksForDisplay = (bookmarks: Bookmark[]) =>
  [...bookmarks].sort((left, right) => {
    if (left.createdAt !== right.createdAt) {
      return right.createdAt.localeCompare(left.createdAt);
    }

    if (left.targetType !== right.targetType) {
      return left.targetType.localeCompare(right.targetType);
    }

    if (left.targetId !== right.targetId) {
      return left.targetId.localeCompare(right.targetId);
    }

    return left.id.localeCompare(right.id);
  });

const compareNotes = (left: Note, right: Note) => {
  if (left.pinned !== right.pinned) {
    return left.pinned ? -1 : 1;
  }

  if (left.updatedAt !== right.updatedAt) {
    return right.updatedAt.localeCompare(left.updatedAt);
  }

  if (left.createdAt !== right.createdAt) {
    return right.createdAt.localeCompare(left.createdAt);
  }

  return right.id.localeCompare(left.id);
};

export const sortNotesForDisplay = (notes: NoteListItemDto[]) =>
  [...notes].sort((left, right) => {
    return compareNotes(left.note, right.note);
  });

export const applyNoteUpsertResult = (notes: NoteListItemDto[], nextNote: NoteListItemDto) =>
  sortNotesForDisplay([nextNote, ...notes.filter((note) => note.note.id !== nextNote.note.id)]);

export const removeNoteFromCollection = (notes: NoteListItemDto[], noteId: string) =>
  notes.filter((note) => note.note.id !== noteId);

export const applyBookmarkToggleResult = (
  bookmarks: Bookmark[],
  targetType: Bookmark['targetType'],
  targetId: string,
  nextBookmark: Bookmark | null,
) => {
  const remainingBookmarks = bookmarks.filter(
    (bookmark) => !(bookmark.targetType === targetType && bookmark.targetId === targetId),
  );

  if (!nextBookmark) {
    return remainingBookmarks;
  }

  return sortBookmarksForDisplay([nextBookmark, ...remainingBookmarks]);
};
