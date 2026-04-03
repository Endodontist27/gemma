import { useEffect, useState } from 'react';

import type { CommunityQuestionDto } from '@application/dto/CommunityQuestionDto';
import { useAppContainer } from '@app/bootstrap/AppContainerContext';
import { useAppStore } from '@presentation/hooks/useAppStore';

export const useCommunityViewModel = () => {
  const container = useAppContainer();
  const lectureExperienceOrchestrator = container.orchestrators.lectureExperienceOrchestrator;
  const activeSessionId = useAppStore((state) => state.activeSessionId);
  const contentVersion = useAppStore((state) => state.contentVersion);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<CommunityQuestionDto[]>([]);

  useEffect(() => {
    if (!activeSessionId) {
      setItems([]);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await lectureExperienceOrchestrator.getCommunityFeed(activeSessionId);

        if (!cancelled) {
          setItems(response);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : 'Failed to load community feed.',
          );
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
  }, [activeSessionId, contentVersion, lectureExperienceOrchestrator]);

  return {
    activeSessionId,
    error,
    isLoading,
    items,
  };
};
