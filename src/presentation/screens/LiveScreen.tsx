import { StyleSheet, Text } from 'react-native';

import { EmptyState } from '@presentation/components/EmptyState';
import { OverviewMetricGrid } from '@presentation/components/OverviewMetricGrid';
import { Screen } from '@presentation/components/Screen';
import { ScreenHeader } from '@presentation/components/ScreenHeader';
import { SectionCard } from '@presentation/components/SectionCard';
import { SessionHeader } from '@presentation/components/SessionHeader';
import { TranscriptTimeline } from '@presentation/components/TranscriptTimeline';
import { themeColors } from '@presentation/theme/tokens';
import { useLiveViewModel } from '@presentation/view-models/useLiveViewModel';

export const LiveScreen = () => {
  const viewModel = useLiveViewModel();

  if (!viewModel.activeSessionId) {
    return (
      <Screen>
        <ScreenHeader
          eyebrow="Live lecture context"
          subtitle="Review the active lecture timeline, local summaries, and transcript evidence stored on device."
          title="Live"
        />
        <EmptyState
          description="Choose an active session from Lecture Sessions to load the live lecture workspace."
          title="No active session"
        />
      </Screen>
    );
  }

  if (!viewModel.overview) {
    return (
      <Screen>
        <ScreenHeader
          eyebrow="Live lecture context"
          subtitle="Review the active lecture timeline, local summaries, and transcript evidence stored on device."
          title="Live"
        />
        <EmptyState
          actionLabel={viewModel.error ? 'Retry' : undefined}
          description={viewModel.error ?? 'Loading the active lecture workspace from the local database.'}
          onAction={viewModel.error ? viewModel.reloadOverview : undefined}
          title={viewModel.isLoading ? 'Loading session' : 'Session unavailable'}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        eyebrow="Live lecture context"
        subtitle="Review the active lecture timeline, local summaries, and transcript evidence stored on device."
        title="Live"
      />
      <SectionCard>
        <SessionHeader session={viewModel.overview.session} />
      </SectionCard>

      <SectionCard
        subtitle={`Status: ${viewModel.overview.session.status.replace(/_/g, ' ')} | Pack: ${viewModel.overview.session.sourcePackVersion}`}
        title="Session Snapshot"
      >
        <OverviewMetricGrid counts={viewModel.overview.counts} />
        <Text style={styles.meta}>
          Tags:{' '}
          {viewModel.overview.session.tags.length
            ? viewModel.overview.session.tags.join(' | ')
            : 'none'}
        </Text>
      </SectionCard>

      {viewModel.overview.summaries.length ? (
        viewModel.overview.summaries.map((summary) => (
          <SectionCard
            key={summary.id}
            subtitle={summary.kind.replace(/_/g, ' ')}
            title={summary.title}
          >
            <Text style={styles.summaryText}>{summary.text}</Text>
          </SectionCard>
        ))
      ) : (
        <SectionCard
          subtitle="Session summaries come from uploaded lecture evidence. Local Gemma improves the overview when the runtime is available."
          title="Summary not available for this session"
        >
          <Text style={styles.placeholderText}>
            This session does not yet have enough imported lecture evidence to produce a summary.
          </Text>
        </SectionCard>
      )}

      <SectionCard
        subtitle={`${viewModel.overview.latestTranscriptEntries.length} most recent entries highlighted from ${viewModel.overview.counts.transcriptEntryCount} locally stored transcript items.`}
        title="Recent Transcript"
      >
        {viewModel.overview.latestTranscriptEntries.length ? (
          <TranscriptTimeline entries={viewModel.overview.latestTranscriptEntries} />
        ) : (
          <Text style={styles.placeholderText}>
            No transcript entries are stored for this session yet.
          </Text>
        )}
      </SectionCard>

      <SectionCard subtitle="Full locally stored transcript timeline." title="Transcript Timeline">
        {viewModel.overview.transcriptEntries.length ? (
          <TranscriptTimeline entries={viewModel.overview.transcriptEntries} />
        ) : (
          <Text style={styles.placeholderText}>
            Transcript entries appear here once transcript evidence has been imported.
          </Text>
        )}
      </SectionCard>
    </Screen>
  );
};

const styles = StyleSheet.create({
  meta: {
    color: themeColors.textMuted,
    fontSize: 13,
  },
  placeholderText: {
    color: themeColors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  summaryText: {
    color: themeColors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
});

export default LiveScreen;
