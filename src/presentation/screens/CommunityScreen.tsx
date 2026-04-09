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
        eyebrow="Shared grounded answers"
        subtitle="Review the public grounded Q&A imported with the active lecture session."
        title="Community"
      />
      {!viewModel.activeSessionId ? (
        <EmptyState
          description="Choose an active session to review the shared grounded Q&A imported for it."
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
            viewModel.error ?? 'No public grounded Q&A has been imported for this session yet.'
          }
          onAction={viewModel.error ? viewModel.reloadCommunityFeed : undefined}
          title="No shared Q&A available"
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
