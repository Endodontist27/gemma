import { AskLectureQuestionUseCase } from '@application/use-cases/AskLectureQuestionUseCase';
import { CreateNoteUseCase } from '@application/use-cases/CreateNoteUseCase';
import { GetSessionOverviewUseCase } from '@application/use-cases/GetSessionOverviewUseCase';
import { ImportLecturePackUseCase } from '@application/use-cases/ImportLecturePackUseCase';
import { ListCommunityFeedUseCase } from '@application/use-cases/ListCommunityFeedUseCase';
import { ListLectureSessionsUseCase } from '@application/use-cases/ListLectureSessionsUseCase';
import { ListMaterialsUseCase } from '@application/use-cases/ListMaterialsUseCase';
import { ListNotesUseCase } from '@application/use-cases/ListNotesUseCase';
import { SelectLectureSessionUseCase } from '@application/use-cases/SelectLectureSessionUseCase';
import { ToggleBookmarkUseCase } from '@application/use-cases/ToggleBookmarkUseCase';

import type { AppPorts, AppRepositories, AppServices, AppUseCases } from '@app/bootstrap/types';

export const createUseCases = (
  repositories: AppRepositories,
  services: AppServices,
  ports: AppPorts,
): AppUseCases => ({
  listLectureSessionsUseCase: new ListLectureSessionsUseCase(repositories.lectureSessionRepository),
  importLecturePackUseCase: new ImportLecturePackUseCase(services.lecturePackImportService),
  getSessionOverviewUseCase: new GetSessionOverviewUseCase(
    repositories.lectureSessionRepository,
    repositories.summaryRepository,
    repositories.transcriptEntryRepository,
    services.summarizationService,
  ),
  askLectureQuestionUseCase: new AskLectureQuestionUseCase(
    repositories.qaCategoryRepository,
    services.categorizationService,
    services.retrievalService,
    services.supportCheckService,
    services.questionAnsweringService,
    ports.transactionRunner,
  ),
  listCommunityFeedUseCase: new ListCommunityFeedUseCase(
    repositories.questionRepository,
    repositories.answerRepository,
    repositories.answerSourceRepository,
    repositories.qaCategoryRepository,
  ),
  listMaterialsUseCase: new ListMaterialsUseCase(
    repositories.lectureMaterialRepository,
    repositories.materialChunkRepository,
    repositories.glossaryTermRepository,
    repositories.bookmarkRepository,
  ),
  listNotesUseCase: new ListNotesUseCase(
    repositories.noteRepository,
    repositories.bookmarkRepository,
  ),
  createNoteUseCase: new CreateNoteUseCase(repositories.noteRepository),
  toggleBookmarkUseCase: new ToggleBookmarkUseCase(repositories.bookmarkRepository),
  selectLectureSessionUseCase: new SelectLectureSessionUseCase(ports.selectedSessionStore),
});
