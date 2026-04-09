import { useEffect, useState } from 'react';

import type { SessionOverviewDto } from '@application/dto/SessionOverviewDto';
import { useAppStore } from '@presentation/hooks/useAppStore';
import { useAppContainer } from '@/app-shell/bootstrap/AppContainerContext';

export const useLiveViewModel = () => {
  const container = useAppContainer();
  const lectureExperienceOrchestrator = container.orchestrators.lectureExperienceOrchestrator;
  const activeSessionId = useAppStore((state) => state.activeSessionId);
  const contentVersion = useAppStore((state) => state.contentVersion);

  const [overview, setOverview] = useState<SessionOverviewDto | null>(null);
  const [overviewSessionId, setOverviewSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    setOverview(null);
    setOverviewSessionId(null);
    setError(null);
    setIsLoading(false);
  }, [activeSessionId]);

  useEffect(() => {
    if (!activeSessionId) {
      setOverview(null);
      setOverviewSessionId(null);
      setError(null);
      setIsLoading(false);
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
          setOverviewSessionId(activeSessionId);
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
  }, [activeSessionId, contentVersion, lectureExperienceOrchestrator, reloadVersion]);

  return {
    activeSessionId,
    error,
    isLoading,
    overview: overviewSessionId === activeSessionId ? overview : null,
    reloadOverview: () => {
      setReloadVersion((value) => value + 1);
    },
  };
};
