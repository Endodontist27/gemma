import { EmptyState } from '@presentation/components/EmptyState';
import { LoadingView } from '@presentation/components/LoadingView';
import { QuestionThreadCard } from '@presentation/components/QuestionThreadCard';
import { Screen } from '@presentation/components/Screen';
import { ScreenHeader } from '@presentation/components/ScreenHeader';
import { useCommunityViewModel } from '@presentation/view-models/useCommunityViewModel';

export const CommunityScreen = () => {
  const viewModel = useCommunityViewModel();

  return (
    <Screen>
      <ScreenHeader
        eyebrow="Audience community"
        subtitle="See questions other attendees chose to share, so the whole room can learn from the same grounded answers."
        title="Community"
      />
      {!viewModel.activeSessionId ? (
        <EmptyState
          description="Choose an active workspace to review shared audience questions for this lecture."
          title="Choose a session first"
        />
      ) : null}

      {viewModel.activeSessionId && viewModel.isLoading && !viewModel.items.length ? (
        <LoadingView message="Loading community Q&A..." />
      ) : null}

      {viewModel.activeSessionId && !viewModel.items.length && !viewModel.isLoading ? (
        <EmptyState
          actionLabel={viewModel.error ? 'Retry' : undefined}
          description={
            viewModel.error ?? 'No audience questions have been shared for this session yet.'
          }
          onAction={viewModel.error ? viewModel.reloadCommunityFeed : undefined}
          title="No shared questions yet"
        />
      ) : null}

      {viewModel.items.map((item) => (
        <QuestionThreadCard
          key={item.question.id}
          answer={item.answer}
          category={item.category}
          question={item.question}
          sources={item.sources}
        />
      ))}
    </Screen>
  );
};

export default CommunityScreen;
