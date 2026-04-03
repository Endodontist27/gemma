import { useEffect, useState } from 'react';

import type { SessionOverviewDto } from '@application/dto/SessionOverviewDto';
import { useAppContainer } from '@app/bootstrap/AppContainerContext';
import { useAppStore } from '@presentation/hooks/useAppStore';

export const useLiveViewModel = () => {
  const container = useAppContainer();
  const lectureExperienceOrchestrator = container.orchestrators.lectureExperienceOrchestrator;
  const activeSessionId = useAppStore((state) => state.activeSessionId);
  const contentVersion = useAppStore((state) => state.contentVersion);

  const [overview, setOverview] = useState<SessionOverviewDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!activeSessionId) {
      setOverview(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await lectureExperienceOrchestrator.getOverview(activeSessionId);
        if (!cancelled) {
          setOverview(result);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load overview.');
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
    overview,
  };
};
