import type { DatabaseInitializer } from '@application/ports/DatabaseInitializer';
import type { SelectedSessionStore } from '@application/ports/SelectedSessionStore';
import type { ImportLecturePackUseCase } from '@application/use-cases/ImportLecturePackUseCase';
import type { ListLectureSessionsUseCase } from '@application/use-cases/ListLectureSessionsUseCase';
import type { SummaryRepository } from '@domain/repository-contracts/SummaryRepository';
import type { LectureSessionRepository } from '@domain/repository-contracts/LectureSessionRepository';
import type { SummarizationService } from '@domain/service-contracts/SummarizationService';

export interface AppBootstrapResult {
  activeSessionId: string | null;
}

export class AppBootstrapOrchestrator {
  constructor(
    private readonly databaseInitializer: DatabaseInitializer,
    private readonly lectureSessionRepository: LectureSessionRepository,
    private readonly summaryRepository: SummaryRepository,
    private readonly summarizationService: SummarizationService,
    private readonly listLectureSessionsUseCase: ListLectureSessionsUseCase,
    private readonly importLecturePackUseCase: ImportLecturePackUseCase,
    private readonly selectedSessionStore: SelectedSessionStore,
  ) {}

  async execute(demoPackJson: string, demoSourceLabel: string): Promise<AppBootstrapResult> {
    await this.databaseInitializer.initialize();

    if ((await this.lectureSessionRepository.count()) === 0) {
      await this.importLecturePackUseCase.execute(demoPackJson, demoSourceLabel);
    }

    const sessions = await this.listLectureSessionsUseCase.execute();

    for (const session of sessions) {
      const summaries = await this.summaryRepository.listBySession(session.id);
      if (!summaries.length) {
        const generated = await this.summarizationService.generateSessionSummaries(session.id);
        await this.summaryRepository.saveMany(generated);
      }
    }

    const persistedSessionId = await this.selectedSessionStore.getSelectedSessionId();
    const activeSessionId =
      sessions.find((session) => session.id === persistedSessionId)?.id ?? sessions[0]?.id ?? null;

    await this.selectedSessionStore.setSelectedSessionId(activeSessionId);

    return {
      activeSessionId,
    };
  }
}
