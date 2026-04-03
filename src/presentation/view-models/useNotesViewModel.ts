import { useEffect, useState } from 'react';

import type { NotesSnapshotDto } from '@application/dto/NotesSnapshotDto';
import { useAppContainer } from '@app/bootstrap/AppContainerContext';
import { useAppStore } from '@presentation/hooks/useAppStore';

export const useNotesViewModel = () => {
  const container = useAppContainer();
  const createNoteUseCase = container.useCases.createNoteUseCase;
  const listNotesUseCase = container.useCases.listNotesUseCase;
  const activeSessionId = useAppStore((state) => state.activeSessionId);
  const contentVersion = useAppStore((state) => state.contentVersion);
  const bumpContentVersion = useAppStore((state) => state.bumpContentVersion);

  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [snapshot, setSnapshot] = useState<NotesSnapshotDto | null>(null);

  useEffect(() => {
    if (!activeSessionId) {
      setSnapshot(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await listNotesUseCase.execute(activeSessionId);
        if (!cancelled) {
          setSnapshot(response);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load notes.');
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
  }, [activeSessionId, contentVersion, listNotesUseCase]);

  const createNote = async () => {
    if (!activeSessionId || !draft.trim()) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      await createNoteUseCase.execute(activeSessionId, draft);
      setDraft('');
      bumpContentVersion();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save note.');
    } finally {
      setIsSaving(false);
    }
  };

  return {
    activeSessionId,
    createNote,
    draft,
    error,
    isLoading,
    isSaving,
    setDraft,
    snapshot,
  };
};
