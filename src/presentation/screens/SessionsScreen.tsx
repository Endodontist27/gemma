import { StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@presentation/components/EmptyState';
import { LoadingView } from '@presentation/components/LoadingView';
import { PrimaryButton } from '@presentation/components/PrimaryButton';
import { Screen } from '@presentation/components/Screen';
import { SectionCard } from '@presentation/components/SectionCard';
import { useSessionsViewModel } from '@presentation/view-models/useSessionsViewModel';

export const SessionsScreen = () => {
  const viewModel = useSessionsViewModel();

  return (
    <Screen>
      <SectionCard
        subtitle="Offline-first audience app for live lectures. Import a lecture pack, select the active session, and keep every answer grounded in local data."
        title="Lecture Sessions"
      >
        <View style={styles.actions}>
          <PrimaryButton
            disabled={viewModel.isImporting}
            label={viewModel.isImporting ? 'Importing...' : 'Import Demo Pack'}
            onPress={() => {
              void viewModel.importDemoPack();
            }}
          />
          <PrimaryButton
            disabled={viewModel.isImporting}
            label="Import JSON From Device"
            onPress={() => {
              void viewModel.importFromDevice();
            }}
            tone="secondary"
          />
        </View>
        {viewModel.error ? <Text style={styles.error}>{viewModel.error}</Text> : null}
      </SectionCard>

      {viewModel.isLoading && !viewModel.sessions.length ? (
        <LoadingView message="Loading lecture sessions..." />
      ) : null}

      {!viewModel.sessions.length && !viewModel.isLoading ? (
        <EmptyState
          description="No lecture packs are loaded yet. Import the bundled demo pack or choose a local JSON lecture pack."
          title="No Sessions"
        />
      ) : null}

      {viewModel.sessions.map((session) => (
        <SectionCard
          key={session.id}
          subtitle={`${session.lecturer} | ${session.location}`}
          title={session.title}
        >
          <Text style={styles.meta}>
            {session.courseCode} | {session.tags.join(' | ')}
          </Text>
          <Text style={styles.description}>{session.description}</Text>
          <PrimaryButton
            label={viewModel.activeSessionId === session.id ? 'Active Session' : 'Use This Session'}
            onPress={() => {
              void viewModel.selectSession(session.id);
            }}
            tone={viewModel.activeSessionId === session.id ? 'primary' : 'secondary'}
          />
        </SectionCard>
      ))}
    </Screen>
  );
};

const styles = StyleSheet.create({
  actions: {
    gap: 10,
  },
  description: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 20,
  },
  error: {
    color: '#b91c1c',
    fontSize: 13,
  },
  meta: {
    color: '#475569',
    fontSize: 13,
  },
});

export default SessionsScreen;
