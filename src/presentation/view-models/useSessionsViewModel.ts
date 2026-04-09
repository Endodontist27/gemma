import { useEffect, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert } from 'react-native';

import type { SessionWorkspaceDto } from '@application/dto/SessionWorkspaceDto';
import type { GemmaRuntimeStatus } from '@domain/service-contracts/GemmaRuntimeStatus';
import { useAppStore } from '@presentation/hooks/useAppStore';
import { primaryModelId } from '@shared/config/modelConfig';
import type { GroundTruthUploadAsset } from '@shared/types/GroundTruthUploadAsset';
import { logDev } from '@shared/utils/debug';
import { serializeError } from '@shared/utils/serialization';
import { useAppContainer } from '@/app-shell/bootstrap/AppContainerContext';

const TEXT_BASED_UPLOAD_EXTENSIONS = new Set(['json', 'txt', 'md', 'markdown', 'csv']);

const getExtension = (name: string) =>
  name.includes('.') ? name.split('.').pop()?.toLowerCase() ?? '' : '';

export type SessionWorkspaceItem = SessionWorkspaceDto;

export const useSessionsViewModel = () => {
  const container = useAppContainer();
  const getGemmaRuntimeStatusUseCase = container.useCases.getGemmaRuntimeStatusUseCase;
  const clearLocalLectureDataUseCase = container.useCases.clearLocalLectureDataUseCase;
  const importLecturePackUseCase = container.useCases.importLecturePackUseCase;
  const importGroundTruthAssetsUseCase = container.useCases.importGroundTruthAssetsUseCase;
  const listSessionWorkspacesUseCase = container.useCases.listSessionWorkspacesUseCase;
  const selectLectureSessionUseCase = container.useCases.selectLectureSessionUseCase;
  const activeSessionId = useAppStore((state) => state.activeSessionId);
  const contentVersion = useAppStore((state) => state.contentVersion);
  const setActiveSessionId = useAppStore((state) => state.setActiveSessionId);
  const bumpContentVersion = useAppStore((state) => state.bumpContentVersion);

  const [sessionWorkspaces, setSessionWorkspaces] = useState<SessionWorkspaceItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGemmaStatusLoading, setIsGemmaStatusLoading] = useState(true);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [gemmaReloadVersion, setGemmaReloadVersion] = useState(0);
  const [selectingSessionId, setSelectingSessionId] = useState<string | null>(null);
  const [isClearingData, setIsClearingData] = useState(false);
  const [gemmaStatus, setGemmaStatus] = useState<GemmaRuntimeStatus | null>(null);
  const [gemmaStatusError, setGemmaStatusError] = useState<string | null>(null);
  const hasIndexingInFlight = sessionWorkspaces.some((workspace) =>
    workspace.indexedAssets.some(
      (asset) => asset.status === 'pending' || asset.status === 'processing',
    ),
  );

  useEffect(() => {
    let cancelled = false;

    const loadSessions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const workspaceItems = await listSessionWorkspacesUseCase.execute();
        if (!cancelled) {
          setSessionWorkspaces(workspaceItems);
          if (workspaceItems.length === 1 && activeSessionId !== workspaceItems[0]?.session.id) {
            await selectLectureSessionUseCase.execute(workspaceItems[0]?.session.id ?? null);
            setActiveSessionId(workspaceItems[0]?.session.id ?? null);
          }
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
  }, [
    activeSessionId,
    contentVersion,
    listSessionWorkspacesUseCase,
    reloadVersion,
    selectLectureSessionUseCase,
    setActiveSessionId,
  ]);

  useEffect(() => {
    let cancelled = false;

    const loadGemmaStatus = async () => {
      try {
        setIsGemmaStatusLoading(true);
        setGemmaStatusError(null);
        const status = await getGemmaRuntimeStatusUseCase.execute({
          probeWarmup: gemmaReloadVersion > 0,
        });
        if (!cancelled) {
          setGemmaStatus(status);
        }
      } catch (statusError) {
        if (!cancelled) {
          setGemmaStatusError(
            statusError instanceof Error
              ? statusError.message
              : 'Failed to load Gemma runtime status.',
          );
        }
      } finally {
        if (!cancelled) {
          setIsGemmaStatusLoading(false);
        }
      }
    };

    void loadGemmaStatus();

    return () => {
      cancelled = true;
    };
  }, [gemmaReloadVersion, getGemmaRuntimeStatusUseCase]);

  useEffect(() => {
    if (!hasIndexingInFlight) {
      return;
    }

    const timer = setTimeout(() => {
      setReloadVersion((value) => value + 1);
    }, 2500);

    return () => {
      clearTimeout(timer);
    };
  }, [hasIndexingInFlight, sessionWorkspaces]);

  const selectSession = async (sessionId: string) => {
    if (selectingSessionId === sessionId || activeSessionId === sessionId) {
      return;
    }

    try {
      setError(null);
      setSelectingSessionId(sessionId);
      await selectLectureSessionUseCase.execute(sessionId);
      setActiveSessionId(sessionId);
    } catch (selectionError) {
      setError(
        selectionError instanceof Error ? selectionError.message : 'Failed to activate session.',
      );
    } finally {
      setSelectingSessionId(null);
    }
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

  const importGroundTruthFiles = async () => {
    try {
      setError(null);
      logDev('ground-truth-import', 'Opening local file picker');
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (result.canceled || !result.assets.length) {
        logDev('ground-truth-import', 'File picker cancelled');
        return;
      }

      setIsImporting(true);
      logDev(
        'ground-truth-import',
        'Preparing selected assets',
        result.assets.map((asset) => ({
          name: asset.name,
          mimeType: asset.mimeType,
          uri: asset.uri,
        })),
      );

      const assets: GroundTruthUploadAsset[] = [];

      for (const asset of result.assets) {
        const extension = getExtension(asset.name ?? '');
        const textContent = TEXT_BASED_UPLOAD_EXTENSIONS.has(extension)
          ? await FileSystem.readAsStringAsync(asset.uri)
          : null;

        assets.push({
          name: asset.name ?? 'ground-truth-upload',
          mimeType: asset.mimeType ?? null,
          textContent,
          sourceUri: asset.uri,
          sizeBytes: asset.size ?? null,
        });
      }

      logDev(
        'ground-truth-import',
        'Dispatching grounded import',
        assets.map((asset) => ({
          name: asset.name,
          mimeType: asset.mimeType,
          sourceUri: asset.sourceUri,
          hasTextContent: typeof asset.textContent === 'string',
        })),
      );

      const session = await importGroundTruthAssetsUseCase.execute(
        assets,
        result.assets.length === 1
          ? result.assets[0]?.name ?? 'ground-truth-upload'
          : `ground-truth-upload-${result.assets.length}-files`,
        {
          mergeIntoSessionId:
            activeSessionId ??
            (sessionWorkspaces.length === 1 ? sessionWorkspaces[0]?.session.id ?? null : null),
        },
      );

      logDev('ground-truth-import', 'Grounded import completed', {
        sessionId: session.id,
        sessionTitle: session.title,
      });
      bumpContentVersion();
      await selectLectureSessionUseCase.execute(session.id);
      setActiveSessionId(session.id);
    } catch (importError) {
      logDev(
        'ground-truth-import',
        'Grounded import failed',
        serializeError(importError),
      );
      setError(
        importError instanceof Error
          ? importError.message
          : 'Grounded source import failed.',
      );
    } finally {
      setIsImporting(false);
    }
  };

  const importFromDevice = async () => {
    try {
      setError(null);
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
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Import failed.');
    }
  };

  const reloadSessions = () => {
    setReloadVersion((value) => value + 1);
  };

  const reloadGemmaStatus = () => {
    setGemmaReloadVersion((value) => value + 1);
  };

  const clearLocalData = () => {
    if (isClearingData) {
      return;
    }

    Alert.alert(
      'Remove all local lecture data?',
      'This will permanently remove all imported sessions, notes, bookmarks, questions, answers, and summaries stored on this device.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove all data',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                setError(null);
                setIsClearingData(true);
                await clearLocalLectureDataUseCase.execute();
                setSessionWorkspaces([]);
                setActiveSessionId(null);
                bumpContentVersion();
              } catch (clearError) {
                setError(
                  clearError instanceof Error
                    ? clearError.message
                    : 'Failed to remove local lecture data.',
                );
              } finally {
                setIsClearingData(false);
              }
            })();
          },
        },
      ],
    );
  };

  return {
    activeSessionId,
    clearLocalData,
    error,
    gemmaStatus,
    gemmaStatusError,
    importFromDevice,
    importGroundTruthFiles,
    isClearingData,
    isGemmaStatusLoading,
    isImporting,
    isLoading,
    primaryModelId,
    reloadGemmaStatus,
    reloadSessions,
    selectSession,
    selectingSessionId,
    sessionWorkspaces,
  };
};
