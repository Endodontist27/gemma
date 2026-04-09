import { isGemmaRuntimeError } from '@domain/service-contracts/GemmaRuntimeError';
import type { GemmaAdapter } from '@domain/service-contracts/GemmaAdapter';
import type { DatabaseInitializer } from '@application/ports/DatabaseInitializer';
import type { SelectedSessionStore } from '@application/ports/SelectedSessionStore';
import type { EnsureSingleSessionWorkspaceUseCase } from '@application/use-cases/EnsureSingleSessionWorkspaceUseCase';
import type { ListLectureSessionsUseCase } from '@application/use-cases/ListLectureSessionsUseCase';
import type { SummaryRepository } from '@domain/repository-contracts/SummaryRepository';
import type { LectureSessionRepository } from '@domain/repository-contracts/LectureSessionRepository';
import type { SummarizationService } from '@domain/service-contracts/SummarizationService';
import { logDev } from '@shared/utils/debug';

export interface AppBootstrapResult {
  activeSessionId: string | null;
}

type BootstrapProgressListener = (message: string) => void;

export class AppBootstrapOrchestrator {
  constructor(
    private readonly databaseInitializer: DatabaseInitializer,
    private readonly lectureSessionRepository: LectureSessionRepository,
    private readonly summaryRepository: SummaryRepository,
    private readonly summarizationService: SummarizationService,
    private readonly gemmaAdapter: GemmaAdapter,
    private readonly ensureSingleSessionWorkspaceUseCase: EnsureSingleSessionWorkspaceUseCase,
    private readonly listLectureSessionsUseCase: ListLectureSessionsUseCase,
    private readonly selectedSessionStore: SelectedSessionStore,
  ) {}

  async execute(
    onProgress?: BootstrapProgressListener,
  ): Promise<AppBootstrapResult> {
    const report = (message: string) => {
      onProgress?.(message);
      logDev('bootstrap', message);
    };

    report('Initializing local database...');
    await this.databaseInitializer.initialize();
    report('Local database ready.');

    const persistedSessionId = await this.selectedSessionStore.getSelectedSessionId();
    logDev('bootstrap', 'Persisted session id', persistedSessionId);

    report('Preparing lecture workspace...');
    await this.ensureSingleSessionWorkspaceUseCase.execute(persistedSessionId);
    report('Lecture workspace synchronized.');

    report('Checking local Gemma runtime...');
    const gemmaStatus = await this.gemmaAdapter.getStatus();
    if (gemmaStatus.code === 'ready') {
      try {
        report('Warming up local Gemma runtime...');
        await this.gemmaAdapter.warmup();
        report('Local Gemma runtime is ready.');
      } catch (error) {
        if (!isGemmaRuntimeError(error)) {
          throw error;
        }
        report(`Gemma runtime warmup skipped: ${error.status.message}`);
      }
    } else {
      report(`Gemma runtime unavailable: ${gemmaStatus.message}`);
    }

    const sessionCount = await this.lectureSessionRepository.count();
    logDev('bootstrap', 'Current session count', sessionCount);

    report('Loading lecture sessions...');
    const sessions = await this.listLectureSessionsUseCase.execute();
    logDev(
      'bootstrap',
      'Loaded sessions',
      sessions.map((session) => ({ id: session.id, title: session.title })),
    );

    for (const session of sessions) {
      report(`Preparing summaries for ${session.title}...`);
      const summaries = await this.summaryRepository.listBySession(session.id);
      if (!summaries.length) {
        try {
          report(`Generating summaries for ${session.title}...`);
          const generated = await this.summarizationService.generateSessionSummaries(session.id);
          await this.summaryRepository.saveMany(generated);
          logDev('bootstrap', 'Saved generated summaries', generated.length);
        } catch (error) {
          if (!isGemmaRuntimeError(error)) {
            throw error;
          }
          report(`Skipping summary generation for ${session.title}: ${error.status.message}`);
        }
      }
    }

    report('Restoring your session workspace...');
    const activeSessionId =
      sessions.find((session) => session.id === persistedSessionId)?.id ?? sessions[0]?.id ?? null;

    await this.selectedSessionStore.setSelectedSessionId(activeSessionId);
    report('Lecture workspace ready.');
    logDev('bootstrap', 'Active session selected', activeSessionId);

    return {
      activeSessionId,
    };
  }
}
