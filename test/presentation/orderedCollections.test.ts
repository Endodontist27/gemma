import { describe, expect, it } from 'vitest';

import {
  applyBookmarkToggleResult,
  applyNoteUpsertResult,
  removeNoteFromCollection,
  sortNotesForDisplay,
} from '@presentation/view-models/utils/orderedCollections';
import type { Bookmark } from '@domain/entities/Bookmark';
import type { Note } from '@domain/entities/Note';
import type { NoteListItemDto } from '@application/dto/NoteListItemDto';

describe('orderedCollections', () => {
  const createNoteItem = (
    note: Note,
    anchorLabel = 'Session note',
    anchorTypeLabel = 'Session',
  ): NoteListItemDto => ({
    note,
    anchorLabel,
    anchorTypeLabel,
  });

  it('keeps bookmark collections in repository display order after a local toggle', () => {
    const currentBookmarks: Bookmark[] = [
      {
        id: 'bookmark_old',
        sessionId: 'session_demo',
        targetType: 'material_chunk',
        targetId: 'chunk_1',
        label: 'Chunk 1',
        createdAt: '2026-04-03T09:00:00.000Z',
      },
    ];
    const nextBookmark: Bookmark = {
      id: 'bookmark_new',
      sessionId: 'session_demo',
      targetType: 'glossary_term',
      targetId: 'term_1',
      label: 'RAG',
      createdAt: '2026-04-03T10:00:00.000Z',
    };

    const result = applyBookmarkToggleResult(
      currentBookmarks,
      'glossary_term',
      'term_1',
      nextBookmark,
    );

    expect(result.map((bookmark) => bookmark.id)).toEqual(['bookmark_new', 'bookmark_old']);
  });

  it('keeps notes in pinned then newest-first order after a local save', () => {
    const notes: NoteListItemDto[] = [
      createNoteItem({
        id: 'note_old',
        sessionId: 'session_demo',
        content: 'Older note',
        anchorType: 'session',
        anchorId: 'session_demo',
        pinned: false,
        createdAt: '2026-04-03T09:00:00.000Z',
        updatedAt: '2026-04-03T09:00:00.000Z',
      }),
      createNoteItem({
        id: 'note_pinned',
        sessionId: 'session_demo',
        content: 'Pinned note',
        anchorType: 'session',
        anchorId: 'session_demo',
        pinned: true,
        createdAt: '2026-04-03T08:00:00.000Z',
        updatedAt: '2026-04-03T08:00:00.000Z',
      }),
      createNoteItem({
        id: 'note_new',
        sessionId: 'session_demo',
        content: 'Newest note',
        anchorType: 'session',
        anchorId: 'session_demo',
        pinned: false,
        createdAt: '2026-04-03T10:00:00.000Z',
        updatedAt: '2026-04-03T10:00:00.000Z',
      }),
    ];

    const result = sortNotesForDisplay(notes);

    expect(result.map((item) => item.note.id)).toEqual(['note_pinned', 'note_new', 'note_old']);
  });

  it('replaces and resorts a note after a local update', () => {
    const currentNotes: NoteListItemDto[] = [
      createNoteItem({
        id: 'note_old',
        sessionId: 'session_demo',
        content: 'Older note',
        anchorType: 'session',
        anchorId: 'session_demo',
        pinned: false,
        createdAt: '2026-04-03T09:00:00.000Z',
        updatedAt: '2026-04-03T09:00:00.000Z',
      }),
      createNoteItem({
        id: 'note_newer',
        sessionId: 'session_demo',
        content: 'Newer note',
        anchorType: 'session',
        anchorId: 'session_demo',
        pinned: false,
        createdAt: '2026-04-03T10:00:00.000Z',
        updatedAt: '2026-04-03T10:00:00.000Z',
      }),
    ];

    const updatedNote: Note = {
      ...currentNotes[0].note,
      content: 'Older note revised',
      updatedAt: '2026-04-03T11:00:00.000Z',
    };

    const result = applyNoteUpsertResult(
      currentNotes,
      createNoteItem(updatedNote, currentNotes[0]?.anchorLabel, currentNotes[0]?.anchorTypeLabel),
    );

    expect(result.map((item) => item.note.id)).toEqual(['note_old', 'note_newer']);
    expect(result[0]?.note.content).toBe('Older note revised');
  });

  it('removes a note by id from the local collection', () => {
    const notes: NoteListItemDto[] = [
      createNoteItem({
        id: 'note_a',
        sessionId: 'session_demo',
        content: 'A',
        anchorType: 'session',
        anchorId: 'session_demo',
        pinned: false,
        createdAt: '2026-04-03T09:00:00.000Z',
        updatedAt: '2026-04-03T09:00:00.000Z',
      }),
      createNoteItem({
        id: 'note_b',
        sessionId: 'session_demo',
        content: 'B',
        anchorType: 'session',
        anchorId: 'session_demo',
        pinned: false,
        createdAt: '2026-04-03T10:00:00.000Z',
        updatedAt: '2026-04-03T10:00:00.000Z',
      }),
    ];

    const result = removeNoteFromCollection(notes, 'note_a');

    expect(result.map((item) => item.note.id)).toEqual(['note_b']);
  });
});
