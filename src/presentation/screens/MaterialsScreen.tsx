import { StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@presentation/components/EmptyState';
import { LoadingView } from '@presentation/components/LoadingView';
import { PrimaryButton } from '@presentation/components/PrimaryButton';
import { Screen } from '@presentation/components/Screen';
import { ScreenHeader } from '@presentation/components/ScreenHeader';
import { SectionCard } from '@presentation/components/SectionCard';
import { themeColors } from '@presentation/theme/tokens';
import { useMaterialsViewModel } from '@presentation/view-models/useMaterialsViewModel';

export const MaterialsScreen = () => {
  const viewModel = useMaterialsViewModel();
  const snapshot = viewModel.snapshot;

  const bookmarkedTargets = new Set(snapshot?.bookmarks.map((bookmark) => bookmark.targetId) ?? []);

  return (
    <Screen>
      <ScreenHeader
        eyebrow="Lecture evidence"
        subtitle="Browse the uploaded materials, searchable chunks, and glossary definitions that power grounded answers."
        title="Materials"
      />
      {!viewModel.activeSessionId ? (
        <EmptyState
          description="Pick an active session to browse its materials, glossary definitions, and saved bookmarks."
          title="Choose a session first"
        />
      ) : null}

      {viewModel.activeSessionId && viewModel.isLoading && !snapshot ? (
        <LoadingView message="Loading lecture materials..." />
      ) : null}

      {viewModel.activeSessionId && !viewModel.isLoading && !snapshot && viewModel.error ? (
        <EmptyState
          actionLabel="Retry"
          description={viewModel.error}
          onAction={viewModel.reloadMaterials}
          title="Materials Unavailable"
        />
      ) : null}

      {snapshot && snapshot.materials.length === 0 && snapshot.glossary.length === 0 ? (
        <EmptyState
          description="This session does not currently contain imported materials or glossary definitions."
          title="No lecture evidence yet"
        />
      ) : null}

      {viewModel.bookmarkError ? <Text style={styles.error}>{viewModel.bookmarkError}</Text> : null}
      {viewModel.error && snapshot ? <Text style={styles.error}>{viewModel.error}</Text> : null}
      {viewModel.error && snapshot ? (
        <PrimaryButton label="Retry Refresh" onPress={viewModel.reloadMaterials} tone="secondary" />
      ) : null}

      {snapshot?.materials.map((material) => (
        <SectionCard
          key={material.id}
          subtitle={material.type.replace('_', ' ')}
          title={material.title}
        >
          <Text style={styles.body}>{material.contentText}</Text>
          {snapshot.chunks
            .filter((chunk) => chunk.materialId === material.id)
            .map((chunk) => (
              <View key={chunk.id} style={styles.chunk}>
                <Text style={styles.chunkHeading}>{chunk.heading}</Text>
                <Text style={styles.body}>{chunk.text}</Text>
                <PrimaryButton
                  disabled={viewModel.isBookmarkPending('material_chunk', chunk.id)}
                  label={
                    viewModel.isBookmarkPending('material_chunk', chunk.id)
                      ? 'Updating...'
                      : bookmarkedTargets.has(chunk.id)
                        ? 'Remove Bookmark'
                        : 'Bookmark Chunk'
                  }
                  onPress={() => {
                    void viewModel.toggleBookmark('material_chunk', chunk.id, chunk.heading);
                  }}
                  tone="secondary"
                />
              </View>
            ))}
        </SectionCard>
      ))}

      {snapshot?.glossary.length ? (
        <SectionCard
          subtitle="Glossary terms are the highest-priority answer source."
          title="Glossary"
        >
          {snapshot.glossary.map((term) => (
            <View key={term.id} style={styles.chunk}>
              <Text style={styles.chunkHeading}>{term.term}</Text>
              <Text style={styles.body}>{term.definition}</Text>
              <PrimaryButton
                disabled={viewModel.isBookmarkPending('glossary_term', term.id)}
                label={
                  viewModel.isBookmarkPending('glossary_term', term.id)
                    ? 'Updating...'
                    : bookmarkedTargets.has(term.id)
                      ? 'Remove Bookmark'
                      : 'Bookmark Term'
                }
                onPress={() => {
                  void viewModel.toggleBookmark('glossary_term', term.id, term.term);
                }}
                tone="secondary"
              />
            </View>
          ))}
        </SectionCard>
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  body: {
    color: themeColors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  error: {
    color: themeColors.danger,
    fontSize: 13,
  },
  chunk: {
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
    paddingTop: 12,
    gap: 8,
  },
  chunkHeading: {
    color: themeColors.text,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default MaterialsScreen;
