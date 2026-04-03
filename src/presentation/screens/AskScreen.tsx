import { StyleSheet, Text } from 'react-native';

import { EmptyState } from '@presentation/components/EmptyState';
import { QuestionComposer } from '@presentation/components/QuestionComposer';
import { Screen } from '@presentation/components/Screen';
import { SectionCard } from '@presentation/components/SectionCard';
import { SourceList } from '@presentation/components/SourceList';
import { useAskViewModel } from '@presentation/view-models/useAskViewModel';

export const AskScreen = () => {
  const viewModel = useAskViewModel();

  return (
    <Screen>
      {!viewModel.activeSessionId ? (
        <EmptyState
          description="Select a session first. Questions can only be answered against the active lecture pack."
          title="No Active Session"
        />
      ) : (
        <>
          <SectionCard
            subtitle="Answers are restricted to local lecture data only. If the evidence is missing, the app returns an unsupported state."
            title="Ask a Grounded Question"
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
            {viewModel.error ? <Text style={styles.error}>{viewModel.error}</Text> : null}
          </SectionCard>

          {viewModel.result ? (
            <SectionCard
              subtitle={viewModel.result.category?.label ?? 'Uncategorized'}
              title={viewModel.result.question.text}
            >
              <Text style={styles.answer}>{viewModel.result.answer.text}</Text>
              {viewModel.result.sources.length ? (
                <SourceList sources={viewModel.result.sources} />
              ) : null}
            </SectionCard>
          ) : null}
        </>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  answer: {
    color: '#0f172a',
    fontSize: 15,
    lineHeight: 22,
  },
  error: {
    color: '#b91c1c',
    fontSize: 13,
  },
});

export default AskScreen;
