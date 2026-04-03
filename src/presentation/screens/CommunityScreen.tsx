import { StyleSheet, Text } from 'react-native';

import { EmptyState } from '@presentation/components/EmptyState';
import { LoadingView } from '@presentation/components/LoadingView';
import { Screen } from '@presentation/components/Screen';
import { SectionCard } from '@presentation/components/SectionCard';
import { SourceList } from '@presentation/components/SourceList';
import { useCommunityViewModel } from '@presentation/view-models/useCommunityViewModel';

export const CommunityScreen = () => {
  const viewModel = useCommunityViewModel();

  return (
    <Screen>
      {!viewModel.activeSessionId ? (
        <EmptyState
          description="Choose an active session to browse the seeded public Q&A for that lecture pack."
          title="No Active Session"
        />
      ) : null}

      {viewModel.activeSessionId && viewModel.isLoading && !viewModel.items.length ? (
        <LoadingView message="Loading community Q&A..." />
      ) : null}

      {viewModel.activeSessionId && !viewModel.items.length && !viewModel.isLoading ? (
        <EmptyState
          description={
            viewModel.error ?? 'No public Q&A items are available for this lecture pack yet.'
          }
          title="No Community Q&A"
        />
      ) : null}

      {viewModel.items.map((item) => (
        <SectionCard
          key={item.question.id}
          subtitle={item.category?.label ?? 'Community'}
          title={item.question.text}
        >
          <Text style={styles.answer}>{item.answer?.text ?? 'No grounded answer stored yet.'}</Text>
          {item.sources.length ? <SourceList sources={item.sources} /> : null}
        </SectionCard>
      ))}
    </Screen>
  );
};

const styles = StyleSheet.create({
  answer: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 21,
  },
});

export default CommunityScreen;
