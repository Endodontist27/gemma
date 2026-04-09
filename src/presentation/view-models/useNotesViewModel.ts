import { useEffect, useRef, useState } from 'react';

import type { NoteListItemDto } from '@application/dto/NoteListItemDto';
import type { NotesSnapshotDto } from '@application/dto/NotesSnapshotDto';
import type { Bookmark } from '@domain/entities/Bookmark';
import type { Note } from '@domain/entities/Note';
import { useAppStore } from '@presentation/hooks/useAppStore';
import {
  applyBookmarkToggleResult,
  applyNoteUpsertResult,
  removeNoteFromCollection,
  sortNotesForDisplay,
} from '@presentation/view-models/utils/orderedCollections';
import { useAppContainer } from '@/app-shell/bootstrap/AppContainerContext';

export const useNotesViewModel = () => {
  const container = useAppContainer();
  const createNoteUseCase = container.useCases.createNoteUseCase;
  const updateNoteUseCase = container.useCases.updateNoteUseCase;
  const deleteNoteUseCase = container.useCases.deleteNoteUseCase;
  const listNotesUseCase = container.useCases.listNotesUseCase;
  const toggleBookmarkUseCase = container.useCases.toggleBookmarkUseCase;
  const activeSessionId = useAppStore((state) => state.activeSessionId);
  const contentVersion = useAppStore((state) => state.contentVersion);
  const bumpContentVersion = useAppStore((state) => state.bumpContentVersion);

  const [draft, setDraft] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [bookmarkError, setBookmarkError] = useState<string | null>(null);
  const [noteActionError, setNoteActionError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [snapshot, setSnapshot] = useState<NotesSnapshotDto | null>(null);
  const [snapshotSessionId, setSnapshotSessionId] = useState<string | null>(null);
  const [pendingNoteIds, setPendingNoteIds] = useState<string[]>([]);
  const [pendingBookmarkKeys, setPendingBookmarkKeys] = useState<string[]>([]);
  const [reloadVersion, setReloadVersion] = useState(0);
  const latestSessionIdRef = useRef<string | null>(activeSessionId);

  useEffect(() => {
    latestSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  useEffect(() => {
    setDraft('');
    setEditingNoteId(null);
    setSnapshot(null);
    setSnapshotSessionId(null);
    setLoadError(null);
    setSaveError(null);
    setBookmarkError(null);
    setNoteActionError(null);
    setIsLoading(false);
    setIsSaving(false);
    setPendingNoteIds([]);
    setPendingBookmarkKeys([]);
  }, [activeSessionId]);

  useEffect(() => {
    if (!activeSessionId) {
      setSnapshot(null);
      setSnapshotSessionId(null);
      setLoadError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const response = await listNotesUseCase.execute(activeSessionId);
        if (!cancelled) {
          setSnapshot({
            ...response,
            notes: sortNotesForDisplay(response.notes),
          });
          setSnapshotSessionId(activeSessionId);
        }
      } catch (loadError) {
        if (!cancelled) {
          setLoadError(loadError instanceof Error ? loadError.message : 'Failed to load notes.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [activeSessionId, contentVersion, listNotesUseCase, reloadVersion]);

  const createBookmarkKey = (targetType: Bookmark['targetType'], targetId: string) =>
    `${targetType}:${targetId}`;

  const toFallbackNoteItem = (
    note: Note,
    previousItem?: NoteListItemDto | null,
  ): NoteListItemDto => {
    if (
      previousItem &&
      previousItem.note.anchorType === note.anchorType &&
      previousItem.note.anchorId === note.anchorId
    ) {
      return {
        ...previousItem,
        note,
      };
    }

    if (note.anchorType === 'session') {
      return {
        note,
        anchorLabel: 'Session note',
        anchorTypeLabel: 'Session',
      };
    }

    return {
      note,
      anchorLabel: 'Linked evidence',
      anchorTypeLabel: note.anchorType.replace(/_/g, ' '),
    };
  };

  const clearDraftState = () => {
    setDraft('');
    setEditingNoteId(null);
  };

  const submitNote = async () => {
    if (!activeSessionId || !draft.trim() || isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);
      setNoteActionError(null);
      const sessionId = activeSessionId;
      const currentNoteItem = snapshot?.notes.find((item) => item.note.id === editingNoteId) ?? null;
      const savedNote = currentNoteItem
        ? await updateNoteUseCase.execute(currentNoteItem.note, draft)
        : await createNoteUseCase.execute(sessionId, draft);

      if (latestSessionIdRef.current === sessionId) {
        setSnapshot((currentSnapshot) => {
          if (!currentSnapshot) {
            return currentSnapshot;
          }

          return {
            ...currentSnapshot,
            notes: applyNoteUpsertResult(
              currentSnapshot.notes,
              toFallbackNoteItem(savedNote, currentNoteItem),
            ),
          };
        });
        clearDraftState();
      }

      bumpContentVersion();
    } catch (saveError) {
      setSaveError(saveError instanceof Error ? saveError.message : 'Failed to save note.');
    } finally {
      setIsSaving(false);
    }
  };

  const startEditingNote = (noteItem: NoteListItemDto) => {
    setEditingNoteId(noteItem.note.id);
    setDraft(noteItem.note.content);
    setSaveError(null);
    setNoteActionError(null);
  };

  const cancelEditingNote = () => {
    clearDraftState();
    setSaveError(null);
  };

  const deleteNote = async (noteId: string) => {
    if (!activeSessionId || pendingNoteIds.includes(noteId)) {
      return;
    }

    try {
      setNoteActionError(null);
      setPendingNoteIds((currentIds) => [...currentIds, noteId]);
      await deleteNoteUseCase.execute(noteId);

      if (latestSessionIdRef.current === activeSessionId) {
        setSnapshot((currentSnapshot) => {
          if (!currentSnapshot) {
            return currentSnapshot;
          }

          return {
            ...currentSnapshot,
            notes: removeNoteFromCollection(currentSnapshot.notes, noteId),
          };
        });

        if (editingNoteId === noteId) {
          clearDraftState();
        }
      }

      bumpContentVersion();
    } catch (deleteError) {
      setNoteActionError(
        deleteError instanceof Error ? deleteError.message : 'Failed to delete note.',
      );
    } finally {
      setPendingNoteIds((currentIds) => currentIds.filter((currentId) => currentId !== noteId));
    }
  };

  const removeBookmark = async (bookmark: Bookmark) => {
    if (!activeSessionId) {
      return;
    }

    const bookmarkKey = createBookmarkKey(bookmark.targetType, bookmark.targetId);
    if (pendingBookmarkKeys.includes(bookmarkKey)) {
      return;
    }

    try {
      setBookmarkError(null);
      setPendingBookmarkKeys((currentKeys) => [...currentKeys, bookmarkKey]);
      const result = await toggleBookmarkUseCase.execute(
        activeSessionId,
        bookmark.targetType,
        bookmark.targetId,
        bookmark.label,
      );

      if (latestSessionIdRef.current === activeSessionId) {
        setSnapshot((currentSnapshot) => {
          if (!currentSnapshot) {
            return currentSnapshot;
          }

          return {
            ...currentSnapshot,
            bookmarks: applyBookmarkToggleResult(
              currentSnapshot.bookmarks,
              bookmark.targetType,
              bookmark.targetId,
              result.bookmark,
            ),
          };
        });
      }

      bumpContentVersion();
    } catch (toggleError) {
      setBookmarkError(
        toggleError instanceof Error ? toggleError.message : 'Failed to remove bookmark.',
      );
    } finally {
      setPendingBookmarkKeys((currentKeys) =>
        currentKeys.filter((currentKey) => currentKey !== bookmarkKey),
      );
    }
  };

  const reloadNotes = () => {
    setReloadVersion((value) => value + 1);
  };

  return {
    activeSessionId,
    bookmarkError,
    cancelEditingNote,
    deleteNote,
    draft,
    editingNoteId,
    isLoading,
    isBookmarkPending: (targetType: Bookmark['targetType'], targetId: string) =>
      pendingBookmarkKeys.includes(createBookmarkKey(targetType, targetId)),
    isNotePending: (noteId: string) => pendingNoteIds.includes(noteId),
    reloadNotes,
    removeBookmark,
    isSaving,
    loadError,
    noteActionError,
    saveError,
    setDraft,
    startEditingNote,
    snapshot: snapshotSessionId === activeSessionId ? snapshot : null,
    submitNote,
  };
};
