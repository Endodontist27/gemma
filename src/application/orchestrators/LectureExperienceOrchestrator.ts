import type { AskLectureQuestionUseCase } from '@application/use-cases/AskLectureQuestionUseCase';
import type { GetSessionOverviewUseCase } from '@application/use-cases/GetSessionOverviewUseCase';
import type { ListCommunityFeedUseCase } from '@application/use-cases/ListCommunityFeedUseCase';
import type { ListQuestionHistoryUseCase } from '@application/use-cases/ListQuestionHistoryUseCase';

export class LectureExperienceOrchestrator {
  constructor(
    private readonly getSessionOverviewUseCase: GetSessionOverviewUseCase,
    private readonly askLectureQuestionUseCase: AskLectureQuestionUseCase,
    private readonly listCommunityFeedUseCase: ListCommunityFeedUseCase,
    private readonly listQuestionHistoryUseCase: ListQuestionHistoryUseCase,
  ) {}

  async getOverview(sessionId: string) {
    return this.getSessionOverviewUseCase.execute(sessionId);
  }

  async askQuestion(sessionId: string, questionText: string) {
    return this.askLectureQuestionUseCase.execute(sessionId, questionText);
  }

  async getCommunityFeed(sessionId: string) {
    return this.listCommunityFeedUseCase.execute(sessionId);
  }

  async getQuestionHistory(sessionId: string) {
    return this.listQuestionHistoryUseCase.execute(sessionId);
  }
}
