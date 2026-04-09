import { AppBootstrapOrchestrator } from '@application/orchestrators/AppBootstrapOrchestrator';
import { LectureExperienceOrchestrator } from '@application/orchestrators/LectureExperienceOrchestrator';
import type {
  AppOrchestrators,
  AppPorts,
  AppRepositories,
  AppServices,
  AppUseCases,
} from '@/app-shell/bootstrap/types';

export const createOrchestrators = (
  repositories: AppRepositories,
  ports: AppPorts,
  services: AppServices,
  useCases: AppUseCases,
): AppOrchestrators => ({
  appBootstrapOrchestrator: new AppBootstrapOrchestrator(
    ports.databaseInitializer,
    repositories.lectureSessionRepository,
    repositories.summaryRepository,
    services.summarizationService,
    services.gemmaAdapter,
    useCases.ensureSingleSessionWorkspaceUseCase,
    useCases.listLectureSessionsUseCase,
    ports.selectedSessionStore,
  ),
  lectureExperienceOrchestrator: new LectureExperienceOrchestrator(
    useCases.getSessionOverviewUseCase,
    useCases.askLectureQuestionUseCase,
    useCases.listCommunityFeedUseCase,
    useCases.listQuestionHistoryUseCase,
  ),
});
