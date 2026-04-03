import { useEffect, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { bundledDemoPackJson } from '@app/bootstrap/demoPack';
import type { LectureSession } from '@domain/entities/LectureSession';
import { useAppContainer } from '@app/bootstrap/AppContainerContext';
import { useAppStore } from '@presentation/hooks/useAppStore';
import { appConfig } from '@shared/config/appConfig';

export const useSessionsViewModel = () => {
  const container = useAppContainer();
  const listLectureSessionsUseCase = container.useCases.listLectureSessionsUseCase;
  const importLecturePackUseCase = container.useCases.importLecturePackUseCase;
  const selectLectureSessionUseCase = container.useCases.selectLectureSessionUseCase;
  const activeSessionId = useAppStore((state) => state.activeSessionId);
  const contentVersion = useAppStore((state) => state.contentVersion);
  const setActiveSessionId = useAppStore((state) => state.setActiveSessionId);
  const bumpContentVersion = useAppStore((state) => state.bumpContentVersion);

  const [sessions, setSessions] = useState<LectureSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadSessions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const loadedSessions = await listLectureSessionsUseCase.execute();
        if (!cancelled) {
          setSessions(loadedSessions);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load sessions.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadSessions();

    return () => {
      cancelled = true;
    };
  }, [contentVersion, listLectureSessionsUseCase]);

  const selectSession = async (sessionId: string) => {
    await selectLectureSessionUseCase.execute(sessionId);
    setActiveSessionId(sessionId);
  };

  const completeImport = async (rawPack: string, sourceLabel: string) => {
    setIsImporting(true);
    setError(null);

    try {
      const session = await importLecturePackUseCase.execute(rawPack, sourceLabel);
      bumpContentVersion();
      await selectLectureSessionUseCase.execute(session.id);
      setActiveSessionId(session.id);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Import failed.');
    } finally {
      setIsImporting(false);
    }
  };

  const importDemoPack = async () =>
    completeImport(bundledDemoPackJson, appConfig.demoPack.sourceLabel);

  const importFromDevice = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets.length) {
      return;
    }

    const file = result.assets[0];
    const rawPack = await FileSystem.readAsStringAsync(file.uri);
    await completeImport(rawPack, file.name ?? 'device-import');
  };

  return {
    activeSessionId,
    error,
    importDemoPack,
    importFromDevice,
    isImporting,
    isLoading,
    selectSession,
    sessions,
  };
};
