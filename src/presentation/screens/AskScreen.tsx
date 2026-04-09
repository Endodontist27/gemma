import { useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { EmptyState } from '@presentation/components/EmptyState';
import { LoadingView } from '@presentation/components/LoadingView';
import { QuestionComposer } from '@presentation/components/QuestionComposer';
import { QuestionThreadCard } from '@presentation/components/QuestionThreadCard';
import { Screen } from '@presentation/components/Screen';
import { ScreenHeader } from '@presentation/components/ScreenHeader';
import { SectionCard } from '@presentation/components/SectionCard';
import { themeColors } from '@presentation/theme/tokens';
import { useAskViewModel } from '@presentation/view-models/useAskViewModel';

export const AskScreen = () => {
  const router = useRouter();
  const viewModel = useAskViewModel();
  const recentHistory = viewModel.result
    ? viewModel.history.filter((item) => item.question.id !== viewModel.result?.question.id)
    : viewModel.history;
  const openSourceDetail = (answerSourceId: string) => {
    router.push({
      pathname: '/answer-sources/[answerSourceId]',
      params: { answerSourceId },
    });
  };

  return (
    <Screen>
      <ScreenHeader
        eyebrow="Grounded answers"
        subtitle="Ask against the active lecture only. Every answer must come from uploaded local evidence or return an unsupported state."
        title="Ask"
      />

      {!viewModel.activeSessionId ? (
        <EmptyState
          description="Select an active session from Lecture Sessions before asking a grounded question."
          title="Choose a session first"
        />
      ) : (
        <>
          {viewModel.indexingSummary?.totalCount ? (
            <SectionCard
              subtitle={
                viewModel.indexingSummary.processingCount > 0
                  ? `${viewModel.indexingSummary.processingCount} file${viewModel.indexingSummary.processingCount === 1 ? '' : 's'} still indexing. Ask can answer from the searchable subset now.`
                  : viewModel.indexingSummary.failedCount > 0
                    ? `${viewModel.indexingSummary.failedCount} file${viewModel.indexingSummary.failedCount === 1 ? '' : 's'} failed indexing and may not be searchable yet.`
                    : 'All uploaded files in this workspace are indexed and searchable.'
              }
              title="Workspace indexing"
              tone="subtle"
            />
          ) : null}

          <SectionCard
            subtitle="Short, grounded answers only. The app does not improvise beyond the uploaded lecture evidence."
            title="Ask a Grounded Question"
            tone="accent"
          >
            <QuestionComposer
              disabled={!viewModel.activeSessionId}
              loading={viewModel.isSubmitting}
              onChangeText={viewModel.setQuestionText}
              onSubmit={() => {
                void viewModel.submitQuestion();
              }}
              value={viewModel.questionText}
            />
            {viewModel.submitError ? (
              <Text style={styles.error}>{viewModel.submitError}</Text>
            ) : null}
          </SectionCard>

          {viewModel.result ? (
            <QuestionThreadCard
              answer={viewModel.result.answer}
              category={viewModel.result.category}
              onSourcePress={(source) => {
                openSourceDetail(source.id);
              }}
              question={viewModel.result.question}
              sourcePreviewById={viewModel.sourcePreviewById}
              sources={viewModel.result.sources}
            />
          ) : null}

          {viewModel.isHistoryLoading && !viewModel.history.length ? (
            <LoadingView message="Loading saved question history..." />
          ) : null}

          {viewModel.historyError && !viewModel.history.length && !viewModel.isHistoryLoading ? (
            <EmptyState
              actionLabel="Retry"
              description={viewModel.historyError}
              onAction={viewModel.reloadHistory}
              title="Question History Unavailable"
            />
          ) : null}

          {!viewModel.result &&
          !viewModel.history.length &&
          !viewModel.isHistoryLoading &&
          !viewModel.historyError ? (
            <EmptyState
              description="Once you ask your first grounded question, the saved thread will appear here for this session."
              title="Question history is empty"
            />
          ) : null}

          {recentHistory.length ? <Text style={styles.heading}>Recent Questions</Text> : null}

          {recentHistory.map((item) => (
            <QuestionThreadCard
              key={item.question.id}
              answer={item.answer}
              category={item.category}
              onSourcePress={(source) => {
                openSourceDetail(source.id);
              }}
              question={item.question}
              sourcePreviewById={viewModel.sourcePreviewById}
              sources={item.sources}
            />
          ))}
        </>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  error: {
    color: themeColors.danger,
    fontSize: 13,
  },
  heading: {
    color: themeColors.text,
    fontSize: 18,
    fontWeight: '700',
  },
});

export default AskScreen;
