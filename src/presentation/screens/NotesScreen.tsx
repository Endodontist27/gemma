import { StyleSheet, Text, TextInput, View } from 'react-native';

import { EmptyState } from '@presentation/components/EmptyState';
import { LoadingView } from '@presentation/components/LoadingView';
import { PrimaryButton } from '@presentation/components/PrimaryButton';
import { Screen } from '@presentation/components/Screen';
import { SectionCard } from '@presentation/components/SectionCard';
import { useNotesViewModel } from '@presentation/view-models/useNotesViewModel';

export const NotesScreen = () => {
  const viewModel = useNotesViewModel();

  return (
    <Screen>
      {!viewModel.activeSessionId ? (
        <EmptyState
          description="Select a session before creating notes or reviewing bookmarks."
          title="No Active Session"
        />
      ) : null}

      {viewModel.activeSessionId && viewModel.isLoading && !viewModel.snapshot ? (
        <LoadingView message="Loading notes and bookmarks..." />
      ) : null}

      {viewModel.activeSessionId ? (
        <SectionCard
          subtitle="Notes are stored locally in SQLite and attached to the active session."
          title="New Note"
        >
          <TextInput
            multiline
            numberOfLines={4}
            onChangeText={viewModel.setDraft}
            placeholder="Capture an insight, reminder, or follow-up question"
            style={styles.input}
            value={viewModel.draft}
          />
          <PrimaryButton
            disabled={viewModel.isSaving || viewModel.draft.trim().length === 0}
            label={viewModel.isSaving ? 'Saving...' : 'Save Note'}
            onPress={() => {
              void viewModel.createNote();
            }}
          />
          {viewModel.error ? <Text style={styles.error}>{viewModel.error}</Text> : null}
        </SectionCard>
      ) : null}

      {viewModel.snapshot?.notes.length ? (
        <SectionCard title="Saved Notes">
          {viewModel.snapshot.notes.map((note) => (
            <View key={note.id} style={styles.entry}>
              <Text style={styles.body}>{note.content}</Text>
            </View>
          ))}
        </SectionCard>
      ) : null}

      {viewModel.snapshot?.bookmarks.length ? (
        <SectionCard title="Bookmarks">
          {viewModel.snapshot.bookmarks.map((bookmark) => (
            <View key={bookmark.id} style={styles.entry}>
              <Text style={styles.bookmarkLabel}>{bookmark.label}</Text>
              <Text style={styles.body}>{bookmark.targetType.replace('_', ' ')}</Text>
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
  bookmarkLabel: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  entry: {
    gap: 4,
  },
  error: {
    color: '#b91c1c',
    fontSize: 13,
  },
  input: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#ffffff',
    textAlignVertical: 'top',
    fontSize: 15,
    color: '#0f172a',
  },
});

export default NotesScreen;
