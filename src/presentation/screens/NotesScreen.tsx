import { StyleSheet, Text, TextInput, View } from 'react-native';

import { EmptyState } from '@presentation/components/EmptyState';
import { LoadingView } from '@presentation/components/LoadingView';
import { PrimaryButton } from '@presentation/components/PrimaryButton';
import { Screen } from '@presentation/components/Screen';
import { ScreenHeader } from '@presentation/components/ScreenHeader';
import { SectionCard } from '@presentation/components/SectionCard';
import { themeColors } from '@presentation/theme/tokens';
import { useNotesViewModel } from '@presentation/view-models/useNotesViewModel';
import { formatDateTime } from '@shared/utils/dates';

export const NotesScreen = () => {
  const viewModel = useNotesViewModel();
  const isEditing = viewModel.editingNoteId !== null;

  return (
    <Screen>
      <ScreenHeader
        eyebrow="Local notes"
        subtitle="Capture session-specific notes and collect bookmarks from uploaded lecture evidence."
        title="Notes"
      />
      {!viewModel.activeSessionId ? (
        <EmptyState
          description="Select an active session before creating notes or reviewing bookmarks."
          title="Choose a session first"
        />
      ) : null}

      {viewModel.activeSessionId && viewModel.isLoading && !viewModel.snapshot ? (
        <LoadingView message="Loading notes and bookmarks..." />
      ) : null}

      {viewModel.activeSessionId &&
      !viewModel.isLoading &&
      !viewModel.snapshot &&
      viewModel.loadError ? (
        <EmptyState
          actionLabel="Retry"
          description={viewModel.loadError}
          onAction={viewModel.reloadNotes}
          title="Notes Unavailable"
        />
      ) : null}

      {viewModel.activeSessionId ? (
        <SectionCard
          subtitle="Notes are stored locally in SQLite and attached to the active session."
          title={isEditing ? 'Edit Note' : 'New Note'}
        >
          <TextInput
            multiline
            numberOfLines={4}
            onChangeText={viewModel.setDraft}
            placeholder="Capture an insight, reminder, or follow-up question"
            style={styles.input}
            value={viewModel.draft}
          />
          <View style={styles.actions}>
            <PrimaryButton
              disabled={viewModel.isSaving || viewModel.draft.trim().length === 0}
              label={
                viewModel.isSaving
                  ? isEditing
                    ? 'Updating...'
                    : 'Saving...'
                  : isEditing
                    ? 'Update Note'
                    : 'Save Note'
              }
              onPress={() => {
                void viewModel.submitNote();
              }}
            />
            {isEditing ? (
              <PrimaryButton
                label="Cancel"
                onPress={viewModel.cancelEditingNote}
                tone="secondary"
              />
            ) : null}
          </View>
          {viewModel.saveError ? <Text style={styles.error}>{viewModel.saveError}</Text> : null}
          {viewModel.noteActionError ? (
            <Text style={styles.error}>{viewModel.noteActionError}</Text>
          ) : null}
        </SectionCard>
      ) : null}

      {viewModel.snapshot?.notes.length ? (
          <SectionCard title="Saved Notes">
          {viewModel.snapshot.notes.map((item) => (
            <View key={item.note.id} style={styles.entry}>
              <Text style={styles.anchorMeta}>
                {item.anchorTypeLabel}: {item.anchorLabel}
              </Text>
              <Text style={styles.body}>{item.note.content}</Text>
              <Text style={styles.meta}>Updated {formatDateTime(item.note.updatedAt)}</Text>
              <View style={styles.actions}>
                <PrimaryButton
                  disabled={viewModel.isNotePending(item.note.id) || viewModel.isSaving}
                  label={
                    viewModel.editingNoteId === item.note.id
                      ? 'Editing'
                      : viewModel.isNotePending(item.note.id)
                        ? 'Working...'
                        : 'Edit'
                  }
                  onPress={() => {
                    viewModel.startEditingNote(item);
                  }}
                  tone="secondary"
                />
                <PrimaryButton
                  disabled={viewModel.isNotePending(item.note.id)}
                  label={viewModel.isNotePending(item.note.id) ? 'Deleting...' : 'Delete'}
                  onPress={() => {
                    void viewModel.deleteNote(item.note.id);
                  }}
                  tone="secondary"
                />
              </View>
            </View>
          ))}
        </SectionCard>
      ) : viewModel.activeSessionId && viewModel.snapshot ? (
        <EmptyState
          description="Saved notes for the active session will appear here."
          title="No notes saved yet"
        />
      ) : null}

      {viewModel.snapshot?.bookmarks.length ? (
        <SectionCard title="Bookmarks">
          {viewModel.snapshot.bookmarks.map((bookmark) => (
            <View key={bookmark.id} style={styles.entry}>
              <Text style={styles.bookmarkLabel}>{bookmark.label}</Text>
              <Text style={styles.body}>{bookmark.targetType.replace(/_/g, ' ')}</Text>
              <View style={styles.actions}>
                <PrimaryButton
                  disabled={viewModel.isBookmarkPending(bookmark.targetType, bookmark.targetId)}
                  label={
                    viewModel.isBookmarkPending(bookmark.targetType, bookmark.targetId)
                      ? 'Removing...'
                      : 'Remove Bookmark'
                  }
                  onPress={() => {
                    void viewModel.removeBookmark(bookmark);
                  }}
                  tone="secondary"
                />
              </View>
            </View>
          ))}
          {viewModel.bookmarkError ? (
            <Text style={styles.error}>{viewModel.bookmarkError}</Text>
          ) : null}
        </SectionCard>
      ) : viewModel.activeSessionId && viewModel.snapshot ? (
        <EmptyState
          description="Bookmark glossary terms or material chunks from Materials to collect them here."
          title="No bookmarks saved yet"
        />
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
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  anchorMeta: {
    color: themeColors.primaryDeep,
    fontSize: 12,
    fontWeight: '700',
  },
  bookmarkLabel: {
    color: themeColors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  entry: {
    gap: 4,
  },
  error: {
    color: themeColors.danger,
    fontSize: 13,
  },
  meta: {
    color: themeColors.textSubtle,
    fontSize: 12,
  },
  input: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: themeColors.borderStrong,
    borderRadius: 16,
    padding: 14,
    backgroundColor: themeColors.surface,
    textAlignVertical: 'top',
    fontSize: 15,
    color: themeColors.text,
  },
});

export default NotesScreen;
