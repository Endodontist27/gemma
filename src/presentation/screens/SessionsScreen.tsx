import { StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@presentation/components/EmptyState';
import { LoadingView } from '@presentation/components/LoadingView';
import { PrimaryButton } from '@presentation/components/PrimaryButton';
import { Screen } from '@presentation/components/Screen';
import { ScreenHeader } from '@presentation/components/ScreenHeader';
import { SectionCard } from '@presentation/components/SectionCard';
import { StatusPill } from '@presentation/components/StatusPill';
import { themeColors } from '@presentation/theme/tokens';
import type { SessionWorkspaceItem } from '@presentation/view-models/useSessionsViewModel';
import { useSessionsViewModel } from '@presentation/view-models/useSessionsViewModel';

const uploadHighlights = [
  'Lecture pack JSON for a ready-made session.',
  'Grounded files like PDF, PPTX, Markdown, TXT, CSV, and JSON.',
  'Everything stays local and powers Ask, notes, and search.',
];

const runtimeToneMap = {
  ready: 'success',
  warmup_failed: 'warning',
  source_missing: 'warning',
  artifact_missing: 'warning',
  artifact_invalid: 'danger',
  artifact_incompatible: 'danger',
  device_model_missing: 'warning',
  insufficient_memory: 'warning',
  emulator_not_supported: 'warning',
  native_module_missing: 'danger',
  unsupported_platform: 'warning',
  runtime_error: 'danger',
} as const;

const sessionStatusToneMap = {
  scheduled: 'warning',
  live: 'success',
  ended: 'neutral',
} as const;

const assetStatusToneMap = {
  pending: 'neutral',
  processing: 'primary',
  ready: 'success',
  failed: 'danger',
} as const;

const hiddenSessionTags = new Set([
  'uploaded',
  'ground-truth',
  'material',
  'glossary',
  'transcript',
  'summaries',
  'categories',
  'public-qa',
]);

const genericDescriptionPattern = /^Ground-truth lecture import assembled from \d+ uploaded file/iu;

const formatCountLabel = (count: number, singular: string, plural: string) =>
  `${count} ${count === 1 ? singular : plural}`;

const normalizeRuntimeLabel = (code?: string | null) => code?.replace(/_/g, ' ') ?? 'checking';

const formatIndexedAt = (value: string | null) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleString();
};

const formatImportError = (message: string) => {
  if (message.includes('UNIQUE constraint failed: lecture_materials.id')) {
    return 'These files already exist in this workspace. Remove local data to start clean or upload new files.';
  }

  if (message.includes('UNIQUE constraint failed')) {
    return 'Some of these files were already imported into this workspace.';
  }

  return message;
};

const getVisibleSessionTags = (workspace: SessionWorkspaceItem) =>
  workspace.session.tags.filter((tag) => !hiddenSessionTags.has(tag));

const getSessionSubtitle = (workspace: SessionWorkspaceItem) => {
  const { session, sourceFiles, materialCount } = workspace;
  const hasRealCourseCode = session.courseCode !== 'LOCAL-IMPORT';
  const hasRealLecturer = session.lecturer !== 'Imported lecture data';

  if (hasRealCourseCode && hasRealLecturer) {
    return `${session.courseCode} · ${session.lecturer}`;
  }

  if (sourceFiles.length) {
    return `${formatCountLabel(sourceFiles.length, 'file', 'files')} in this workspace`;
  }

  if (materialCount > 0) {
    return `${formatCountLabel(materialCount, 'lecture source', 'lecture sources')} imported`;
  }

  return 'Local lecture workspace';
};

const getSessionDescription = (workspace: SessionWorkspaceItem) => {
  const { session, sourceFiles, materialCount } = workspace;
  if (!genericDescriptionPattern.test(session.description)) {
    return session.description;
  }

  if (sourceFiles.length) {
    return `Built from ${formatCountLabel(sourceFiles.length, 'uploaded file', 'uploaded files')} and ready for grounded answers.`;
  }

  if (materialCount > 0) {
    return `Built from ${formatCountLabel(materialCount, 'local source', 'local sources')} and ready for grounded answers.`;
  }

  return 'This local lecture workspace is ready for grounded answers, notes, and review.';
};

const getIndexingSummary = (workspace: SessionWorkspaceItem) => {
  if (!workspace.indexedAssets.length) {
    return 'Indexing has not started for this workspace yet.';
  }

  const readyCount = workspace.indexedAssets.filter((asset) => asset.status === 'ready').length;
  const processingCount = workspace.indexedAssets.filter((asset) => asset.status === 'processing').length;
  const failedCount = workspace.indexedAssets.filter((asset) => asset.status === 'failed').length;

  if (processingCount > 0) {
    return `${readyCount}/${workspace.indexedAssets.length} files are indexed. ${processingCount} still processing.`;
  }

  if (failedCount > 0) {
    return `${readyCount}/${workspace.indexedAssets.length} files indexed. ${failedCount} need attention.`;
  }

  return `${readyCount}/${workspace.indexedAssets.length} files indexed and searchable.`;
};

const getRuntimeMessage = (viewModel: ReturnType<typeof useSessionsViewModel>) => {
  if (viewModel.gemmaStatusError) {
    return 'The assistant could not be checked right now. Try refreshing in a moment.';
  }

  if (!viewModel.gemmaStatus) {
    return 'Preparing the local assistant for grounded answers.';
  }

  switch (viewModel.gemmaStatus?.code) {
    case 'ready':
      return 'Ready to answer from the files in your current lecture workspace.';
    case 'runtime_error':
      if (viewModel.gemmaStatus.message.includes('Desktop E4B bridge')) {
        return 'The desktop AI bridge is offline right now, so Ask will stay unavailable in the emulator.';
      }
      return 'The assistant is temporarily unavailable. Refresh to try again.';
    default:
      return (
        viewModel.gemmaStatus?.message ??
        'Preparing the local assistant for grounded answers.'
      );
  }
};

export const SessionsScreen = () => {
  const viewModel = useSessionsViewModel();
  const runtimeTone = runtimeToneMap[viewModel.gemmaStatus?.code ?? 'runtime_error'] ?? 'neutral';

  return (
    <Screen>
      <ScreenHeader
        eyebrow="Offline workspace"
        subtitle="Build one local lecture workspace from your uploaded materials, then use it across Ask, notes, and review."
        title="Lecture Sessions"
      />

      <SectionCard
        subtitle="Start with a lecture pack if you already have one, or upload the source files that should power grounded answers."
        title="Build your lecture workspace"
        tone="accent"
      >
        <View style={styles.actions}>
          <PrimaryButton
            disabled={viewModel.isImporting}
            label="Import Lecture Pack JSON"
            onPress={() => {
              void viewModel.importFromDevice();
            }}
            tone="secondary"
          />
          <PrimaryButton
            disabled={viewModel.isImporting}
            label="Upload Grounded Source Files"
            onPress={() => {
              void viewModel.importGroundTruthFiles();
            }}
            tone="primary"
          />
        </View>

        <View style={styles.highlightGrid}>
          {uploadHighlights.map((item) => (
            <View key={item} style={styles.highlightTile}>
              <Text style={styles.highlightText}>{item}</Text>
            </View>
          ))}
        </View>

        {viewModel.error ? (
          <Text style={styles.error}>{formatImportError(viewModel.error)}</Text>
        ) : null}
      </SectionCard>

      <SectionCard
        subtitle="Answers stay grounded in the uploaded lecture files from your active workspace."
        title="AI assistant"
        tone="subtle"
      >
        <View style={styles.runtimeHeader}>
          <StatusPill
            label={viewModel.isGemmaStatusLoading ? 'checking' : normalizeRuntimeLabel(viewModel.gemmaStatus?.code)}
            tone={viewModel.isGemmaStatusLoading ? 'primary' : runtimeTone}
          />
          <PrimaryButton
            label={viewModel.isGemmaStatusLoading ? 'Refreshing...' : 'Refresh'}
            onPress={viewModel.reloadGemmaStatus}
            tone="secondary"
          />
        </View>

        <Text style={styles.description}>{getRuntimeMessage(viewModel)}</Text>
      </SectionCard>

      <SectionCard
        subtitle="Choose the lecture workspace that should power every grounded answer and note."
        title="Stored sessions"
      >
        {viewModel.isLoading && !viewModel.sessionWorkspaces.length ? (
          <LoadingView message="Loading lecture sessions..." />
        ) : null}

        {!viewModel.sessionWorkspaces.length && !viewModel.isLoading && viewModel.error ? (
          <EmptyState
            actionLabel="Retry"
            description={formatImportError(viewModel.error)}
            onAction={viewModel.reloadSessions}
            title="Could not load local sessions"
          />
        ) : null}

        {!viewModel.sessionWorkspaces.length && !viewModel.isLoading && !viewModel.error ? (
          <EmptyState
            description="No lecture workspace is stored locally yet. Upload grounded files or import a lecture pack to begin."
            title="No local sessions"
          />
        ) : null}

        <View style={styles.sessionList}>
          {viewModel.sessionWorkspaces.map((workspace) => {
            const { session, sourceFiles } = workspace;
            const visibleTags = getVisibleSessionTags(workspace);
            const isActive = viewModel.activeSessionId === session.id;

            return (
              <View
                key={session.id}
                style={[styles.sessionCard, isActive ? styles.activeSessionCard : null]}
              >
                <View style={styles.sessionHeader}>
                  <View style={styles.sessionHeading}>
                    <Text style={styles.sessionTitle}>{session.title}</Text>
                    <Text style={styles.sessionSubtitle}>{getSessionSubtitle(workspace)}</Text>
                  </View>

                  <View style={styles.sessionPills}>
                    <StatusPill
                      label={session.status.replace(/_/g, ' ')}
                      tone={sessionStatusToneMap[session.status]}
                    />
                    <StatusPill
                      label={formatCountLabel(sourceFiles.length, 'file', 'files')}
                      tone={isActive ? 'primary' : 'neutral'}
                    />
                  </View>
                </View>

                <Text style={styles.description}>{getSessionDescription(workspace)}</Text>

                {sourceFiles.length ? (
                  <View style={styles.fileSection}>
                    <Text style={styles.fileSectionLabel}>Imported files</Text>
                    <View style={styles.fileList}>
                      {workspace.indexedAssets.length
                        ? workspace.indexedAssets.map((asset) => (
                            <View key={asset.id} style={styles.fileCard}>
                              <View style={styles.fileCardHeader}>
                                <Text numberOfLines={1} style={styles.fileChipLabel}>
                                  {asset.fileName}
                                </Text>
                                <StatusPill
                                  label={asset.status.replace(/_/g, ' ')}
                                  tone={assetStatusToneMap[asset.status]}
                                />
                              </View>
                              {asset.errorMessage ? (
                                <Text style={styles.error}>{asset.errorMessage}</Text>
                              ) : null}
                              {formatIndexedAt(asset.indexedAt) ? (
                                <Text style={styles.fileMeta}>
                                  Indexed {formatIndexedAt(asset.indexedAt)}
                                </Text>
                              ) : null}
                            </View>
                          ))
                        : sourceFiles.map((file) => (
                            <View key={file} style={styles.fileChip}>
                              <Text numberOfLines={1} style={styles.fileChipLabel}>
                                {file}
                              </Text>
                            </View>
                          ))}
                    </View>
                    <Text style={styles.description}>{getIndexingSummary(workspace)}</Text>
                  </View>
                ) : workspace.indexedAssets.length ? (
                  <View style={styles.fileSection}>
                    <Text style={styles.fileSectionLabel}>Imported files</Text>
                    <View style={styles.fileList}>
                      {workspace.indexedAssets.map((asset) => (
                        <View key={asset.id} style={styles.fileCard}>
                          <View style={styles.fileCardHeader}>
                            <Text numberOfLines={1} style={styles.fileChipLabel}>
                              {asset.fileName}
                            </Text>
                            <StatusPill
                              label={asset.status.replace(/_/g, ' ')}
                              tone={assetStatusToneMap[asset.status]}
                            />
                          </View>
                          {asset.errorMessage ? (
                            <Text style={styles.error}>{asset.errorMessage}</Text>
                          ) : null}
                          {formatIndexedAt(asset.indexedAt) ? (
                            <Text style={styles.fileMeta}>
                              Indexed {formatIndexedAt(asset.indexedAt)}
                            </Text>
                          ) : null}
                        </View>
                      ))}
                    </View>
                    <Text style={styles.description}>{getIndexingSummary(workspace)}</Text>
                  </View>
                ) : null}

                {visibleTags.length ? (
                  <View style={styles.tagRow}>
                    {visibleTags.map((tag) => (
                      <View key={tag} style={styles.tag}>
                        <Text style={styles.tagLabel}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                <PrimaryButton
                  disabled={viewModel.isImporting || viewModel.selectingSessionId !== null}
                  label={
                    viewModel.selectingSessionId === session.id
                      ? 'Opening workspace...'
                      : isActive
                        ? 'Current workspace'
                        : 'Use this workspace'
                  }
                  onPress={() => {
                    void viewModel.selectSession(session.id);
                  }}
                  tone={isActive ? 'primary' : 'secondary'}
                />
              </View>
            );
          })}
        </View>
      </SectionCard>

      <SectionCard
        subtitle="Remove all local lecture files, notes, answers, and bookmarks if you want to start over."
        title="Reset workspace"
        tone="subtle"
      >
        <PrimaryButton
          disabled={viewModel.isClearingData}
          label={viewModel.isClearingData ? 'Removing local data...' : 'Remove All Local Lecture Data'}
          onPress={viewModel.clearLocalData}
          tone="secondary"
        />
      </SectionCard>
    </Screen>
  );
};

const styles = StyleSheet.create({
  actions: {
    gap: 10,
  },
  activeSessionCard: {
    borderColor: themeColors.primarySoft,
    backgroundColor: themeColors.surfaceAccent,
  },
  description: {
    color: themeColors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  error: {
    color: themeColors.danger,
    fontSize: 13,
    lineHeight: 19,
  },
  fileChip: {
    backgroundColor: themeColors.surfaceMuted,
    borderColor: themeColors.border,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: '100%',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  fileChipLabel: {
    color: themeColors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  fileCard: {
    backgroundColor: themeColors.surfaceMuted,
    borderColor: themeColors.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  fileCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  fileList: {
    gap: 8,
  },
  fileMeta: {
    color: themeColors.textSubtle,
    fontSize: 12,
    lineHeight: 18,
  },
  fileSection: {
    gap: 10,
  },
  fileSectionLabel: {
    color: themeColors.textSubtle,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  highlightGrid: {
    gap: 10,
  },
  highlightText: {
    color: themeColors.text,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  highlightTile: {
    backgroundColor: '#f7fbff',
    borderColor: '#d6e7ff',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  runtimeHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  sessionCard: {
    backgroundColor: themeColors.surface,
    borderColor: themeColors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  sessionHeader: {
    gap: 12,
  },
  sessionHeading: {
    gap: 6,
  },
  sessionList: {
    gap: 14,
  },
  sessionPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sessionSubtitle: {
    color: themeColors.textSubtle,
    fontSize: 13,
    fontWeight: '600',
  },
  sessionTitle: {
    color: themeColors.text,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  tag: {
    backgroundColor: themeColors.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagLabel: {
    color: themeColors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});

export default SessionsScreen;
