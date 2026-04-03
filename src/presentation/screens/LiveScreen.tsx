import { StyleSheet, Text } from 'react-native';

import { EmptyState } from '@presentation/components/EmptyState';
import { Screen } from '@presentation/components/Screen';
import { SectionCard } from '@presentation/components/SectionCard';
import { SessionHeader } from '@presentation/components/SessionHeader';
import { useLiveViewModel } from '@presentation/view-models/useLiveViewModel';

export const LiveScreen = () => {
  const viewModel = useLiveViewModel();

  if (!viewModel.activeSessionId) {
    return (
      <Screen>
        <EmptyState
          description="Choose a session from the Sessions tab to load the live lecture context."
          title="No Active Session"
        />
      </Screen>
    );
  }

  if (!viewModel.overview) {
    return (
      <Screen>
        <EmptyState
          description={viewModel.error ?? 'Loading the live lecture view from the local database.'}
          title={viewModel.isLoading ? 'Loading Session' : 'Session Unavailable'}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionCard>
        <SessionHeader session={viewModel.overview.session} />
      </SectionCard>

      {viewModel.overview.summaries.map((summary) => (
        <SectionCard
          key={summary.id}
          subtitle={summary.kind.replace('_', ' ')}
          title={summary.title}
        >
          <Text style={styles.body}>{summary.text}</Text>
        </SectionCard>
      ))}

      <SectionCard subtitle="Latest locally stored transcript entries." title="Transcript">
        {viewModel.overview.latestTranscriptEntries.map((entry) => (
          <Text key={entry.id} style={styles.body}>
            {entry.speakerLabel}: {entry.text}
          </Text>
        ))}
      </SectionCard>
    </Screen>
  );
};

const styles = StyleSheet.create({
  body: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 21,
  },
});

export default LiveScreen;
