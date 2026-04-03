import type { LectureSessionRepository } from '@domain/repository-contracts/LectureSessionRepository';
import type { SummaryRepository } from '@domain/repository-contracts/SummaryRepository';
import type { TranscriptEntryRepository } from '@domain/repository-contracts/TranscriptEntryRepository';
import type { SummarizationService } from '@domain/service-contracts/SummarizationService';
import type { SessionOverviewDto } from '@application/dto/SessionOverviewDto';

export class GetSessionOverviewUseCase {
  constructor(
    private readonly lectureSessionRepository: LectureSessionRepository,
    private readonly summaryRepository: SummaryRepository,
    private readonly transcriptEntryRepository: TranscriptEntryRepository,
    private readonly summarizationService: SummarizationService,
  ) {}

  async execute(sessionId: string): Promise<SessionOverviewDto | null> {
    const session = await this.lectureSessionRepository.findById(sessionId);
    if (!session) {
      return null;
    }

    let summaries = await this.summaryRepository.listBySession(sessionId);
    if (!summaries.length) {
      summaries = await this.summarizationService.generateSessionSummaries(sessionId);
      await this.summaryRepository.saveMany(summaries);
    }

    const transcriptEntries = await this.transcriptEntryRepository.listBySession(sessionId);

    return {
      session,
      summaries,
      latestTranscriptEntries: transcriptEntries.slice(-4),
    };
  }
}
