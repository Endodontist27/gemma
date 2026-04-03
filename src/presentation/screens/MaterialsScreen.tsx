import { StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@presentation/components/EmptyState';
import { LoadingView } from '@presentation/components/LoadingView';
import { PrimaryButton } from '@presentation/components/PrimaryButton';
import { Screen } from '@presentation/components/Screen';
import { SectionCard } from '@presentation/components/SectionCard';
import { useMaterialsViewModel } from '@presentation/view-models/useMaterialsViewModel';

export const MaterialsScreen = () => {
  const viewModel = useMaterialsViewModel();
  const snapshot = viewModel.snapshot;

  const bookmarkedTargets = new Set(snapshot?.bookmarks.map((bookmark) => bookmark.targetId) ?? []);

  return (
    <Screen>
      {!viewModel.activeSessionId ? (
        <EmptyState
          description="Pick a lecture session to browse materials, chunks, glossary terms, and bookmarks."
          title="No Active Session"
        />
      ) : null}

      {viewModel.activeSessionId && viewModel.isLoading && !snapshot ? (
        <LoadingView message="Loading lecture materials..." />
      ) : null}

      {viewModel.activeSessionId && !viewModel.isLoading && !snapshot && viewModel.error ? (
        <EmptyState description={viewModel.error} title="Materials Unavailable" />
      ) : null}

      {snapshot && snapshot.materials.length === 0 && snapshot.glossary.length === 0 ? (
        <EmptyState
          description="This lecture pack does not include materials or glossary terms yet."
          title="No Materials"
        />
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
                  label={bookmarkedTargets.has(chunk.id) ? 'Remove Bookmark' : 'Bookmark Chunk'}
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
            </View>
          ))}
        </SectionCard>
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  body: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 20,
  },
  chunk: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 12,
    gap: 8,
  },
  chunkHeading: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default MaterialsScreen;
