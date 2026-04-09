import { useEffect, useRef, useState } from 'react';

import type { MaterialsSnapshotDto } from '@application/dto/MaterialsSnapshotDto';
import type { BookmarkTargetType } from '@domain/value-objects/KnowledgeEnums';
import { useAppStore } from '@presentation/hooks/useAppStore';
import { applyBookmarkToggleResult } from '@presentation/view-models/utils/orderedCollections';
import { useAppContainer } from '@/app-shell/bootstrap/AppContainerContext';

export const useMaterialsViewModel = () => {
  const container = useAppContainer();
  const listMaterialsUseCase = container.useCases.listMaterialsUseCase;
  const toggleBookmarkUseCase = container.useCases.toggleBookmarkUseCase;
  const activeSessionId = useAppStore((state) => state.activeSessionId);
  const contentVersion = useAppStore((state) => state.contentVersion);
  const bumpContentVersion = useAppStore((state) => state.bumpContentVersion);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<MaterialsSnapshotDto | null>(null);
  const [snapshotSessionId, setSnapshotSessionId] = useState<string | null>(null);
  const [bookmarkError, setBookmarkError] = useState<string | null>(null);
  const [pendingBookmarkKeys, setPendingBookmarkKeys] = useState<string[]>([]);
  const [reloadVersion, setReloadVersion] = useState(0);
  const latestSessionIdRef = useRef<string | null>(activeSessionId);

  useEffect(() => {
    latestSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  useEffect(() => {
    setSnapshot(null);
    setSnapshotSessionId(null);
    setError(null);
    setBookmarkError(null);
    setIsLoading(false);
    setPendingBookmarkKeys([]);
  }, [activeSessionId]);

  useEffect(() => {
    if (!activeSessionId) {
      setSnapshot(null);
      setSnapshotSessionId(null);
      setError(null);
      setBookmarkError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await listMaterialsUseCase.execute(activeSessionId);
        if (!cancelled) {
          setSnapshot(response);
          setSnapshotSessionId(activeSessionId);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load materials.');
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
  }, [activeSessionId, contentVersion, listMaterialsUseCase, reloadVersion]);

  const createBookmarkKey = (targetType: BookmarkTargetType, targetId: string) =>
    `${targetType}:${targetId}`;

  const toggleBookmark = async (
    targetType: BookmarkTargetType,
    targetId: string,
    label: string,
  ) => {
    if (!activeSessionId) {
      return;
    }

    const sessionId = activeSessionId;
    const bookmarkKey = createBookmarkKey(targetType, targetId);

    if (pendingBookmarkKeys.includes(bookmarkKey)) {
      return;
    }

    try {
      setBookmarkError(null);
      setPendingBookmarkKeys((currentKeys) => [...currentKeys, bookmarkKey]);
      const result = await toggleBookmarkUseCase.execute(sessionId, targetType, targetId, label);

      if (latestSessionIdRef.current === sessionId) {
        setSnapshot((currentSnapshot) => {
          if (!currentSnapshot) {
            return currentSnapshot;
          }

          return {
            ...currentSnapshot,
            bookmarks: applyBookmarkToggleResult(
              currentSnapshot.bookmarks,
              targetType,
              targetId,
              result.bookmark,
            ),
          };
        });
      }

      bumpContentVersion();
    } catch (toggleError) {
      setBookmarkError(
        toggleError instanceof Error ? toggleError.message : 'Bookmark update failed.',
      );
    } finally {
      setPendingBookmarkKeys((currentKeys) =>
        currentKeys.filter((currentKey) => currentKey !== bookmarkKey),
      );
    }
  };

  const reloadMaterials = () => {
    setReloadVersion((value) => value + 1);
  };

  return {
    activeSessionId,
    bookmarkError,
    error,
    isLoading,
    isBookmarkPending: (targetType: BookmarkTargetType, targetId: string) =>
      pendingBookmarkKeys.includes(createBookmarkKey(targetType, targetId)),
    reloadMaterials,
    snapshot: snapshotSessionId === activeSessionId ? snapshot : null,
    toggleBookmark,
  };
};
