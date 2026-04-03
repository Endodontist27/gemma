import { useEffect, useState } from 'react';

import type { MaterialsSnapshotDto } from '@application/dto/MaterialsSnapshotDto';
import type { BookmarkTargetType } from '@domain/value-objects/KnowledgeEnums';
import { useAppContainer } from '@app/bootstrap/AppContainerContext';
import { useAppStore } from '@presentation/hooks/useAppStore';

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
        const response = await listMaterialsUseCase.execute(activeSessionId);
        if (!cancelled) {
          setSnapshot(response);
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
  }, [activeSessionId, contentVersion, listMaterialsUseCase]);

  const toggleBookmark = async (
    targetType: BookmarkTargetType,
    targetId: string,
    label: string,
  ) => {
    if (!activeSessionId) {
      return;
    }

    await toggleBookmarkUseCase.execute(activeSessionId, targetType, targetId, label);
    bumpContentVersion();
  };

  return {
    activeSessionId,
    error,
    isLoading,
    snapshot,
    toggleBookmark,
  };
};
