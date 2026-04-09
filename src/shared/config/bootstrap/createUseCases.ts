import { AskLectureQuestionUseCase } from '@application/use-cases/AskLectureQuestionUseCase';
import { ClearLocalLectureDataUseCase } from '@application/use-cases/ClearLocalLectureDataUseCase';
import { CreateNoteUseCase } from '@application/use-cases/CreateNoteUseCase';
import { DeleteNoteUseCase } from '@application/use-cases/DeleteNoteUseCase';
import { EnsureSingleSessionWorkspaceUseCase } from '@application/use-cases/EnsureSingleSessionWorkspaceUseCase';
import { GetAnswerSourceDetailUseCase } from '@application/use-cases/GetAnswerSourceDetailUseCase';
import { GetGemmaRuntimeStatusUseCase } from '@application/use-cases/GetGemmaRuntimeStatusUseCase';
import { GetSessionOverviewUseCase } from '@application/use-cases/GetSessionOverviewUseCase';
import { ImportLecturePackUseCase } from '@application/use-cases/ImportLecturePackUseCase';
import { ImportGroundTruthAssetsUseCase } from '@application/use-cases/ImportGroundTruthAssetsUseCase';
import { ListCommunityFeedUseCase } from '@application/use-cases/ListCommunityFeedUseCase';
import { ListLectureSessionsUseCase } from '@application/use-cases/ListLectureSessionsUseCase';
import { ListSessionWorkspacesUseCase } from '@application/use-cases/ListSessionWorkspacesUseCase';
import { ListMaterialsUseCase } from '@application/use-cases/ListMaterialsUseCase';
import { ListNotesUseCase } from '@application/use-cases/ListNotesUseCase';
import { ListQuestionHistoryUseCase } from '@application/use-cases/ListQuestionHistoryUseCase';
import { SelectLectureSessionUseCase } from '@application/use-cases/SelectLectureSessionUseCase';
import { ToggleBookmarkUseCase } from '@application/use-cases/ToggleBookmarkUseCase';
import { UpdateNoteUseCase } from '@application/use-cases/UpdateNoteUseCase';
import type { AppDatabase } from '@infrastructure/database/client';
import { DrizzleGroundTruthSessionAppender } from '@infrastructure/ground-truth-import/GroundTruthSessionAppender';
import { SingleSessionWorkspaceConsolidator } from '@infrastructure/ground-truth-import/SingleSessionWorkspaceConsolidator';
import type {
  AppPorts,
  AppRepositories,
  AppServices,
  AppUseCases,
} from '@/app-shell/bootstrap/types';

export const createUseCases = (
  database: AppDatabase,
  repositories: AppRepositories,
  services: AppServices,
  ports: AppPorts,
): AppUseCases => {
  const sessionWorkspaceConsolidator = new SingleSessionWorkspaceConsolidator({
    lectureSessionRepository: repositories.lectureSessionRepository,
    lectureMaterialRepository: repositories.lectureMaterialRepository,
    materialChunkRepository: repositories.materialChunkRepository,
    glossaryTermRepository: repositories.glossaryTermRepository,
    transcriptEntryRepository: repositories.transcriptEntryRepository,
    summaryRepository: repositories.summaryRepository,
    qaCategoryRepository: repositories.qaCategoryRepository,
    questionRepository: repositories.questionRepository,
    answerRepository: repositories.answerRepository,
    answerSourceRepository: repositories.answerSourceRepository,
    uploadedAssetRepository: repositories.uploadedAssetRepository,
    evidenceUnitRepository: repositories.evidenceUnitRepository,
    assetDigestRepository: repositories.assetDigestRepository,
    noteRepository: repositories.noteRepository,
    bookmarkRepository: repositories.bookmarkRepository,
    sessionAppender: new DrizzleGroundTruthSessionAppender(database),
  });

  return {
    listLectureSessionsUseCase: new ListLectureSessionsUseCase(
      repositories.lectureSessionRepository,
    ),
    ensureSingleSessionWorkspaceUseCase: new EnsureSingleSessionWorkspaceUseCase(
      sessionWorkspaceConsolidator,
    ),
    listSessionWorkspacesUseCase: new ListSessionWorkspacesUseCase(
      repositories.lectureSessionRepository,
      repositories.lectureMaterialRepository,
      repositories.uploadedAssetRepository,
    ),
    clearLocalLectureDataUseCase: new ClearLocalLectureDataUseCase(
      repositories.lectureSessionRepository,
      ports.selectedSessionStore,
    ),
    importLecturePackUseCase: new ImportLecturePackUseCase(services.lecturePackImportService),
    importGroundTruthAssetsUseCase: new ImportGroundTruthAssetsUseCase(
      services.groundTruthImportService,
    ),
    getGemmaRuntimeStatusUseCase: new GetGemmaRuntimeStatusUseCase(services.gemmaAdapter),
    getAnswerSourceDetailUseCase: new GetAnswerSourceDetailUseCase(
      repositories.answerSourceRepository,
      repositories.bookmarkRepository,
      repositories.glossaryTermRepository,
      repositories.materialChunkRepository,
      repositories.transcriptEntryRepository,
      repositories.lectureMaterialRepository,
      repositories.evidenceUnitRepository,
      repositories.uploadedAssetRepository,
    ),
    getSessionOverviewUseCase: new GetSessionOverviewUseCase(
      repositories.lectureSessionRepository,
      repositories.summaryRepository,
      repositories.lectureMaterialRepository,
      repositories.materialChunkRepository,
      repositories.glossaryTermRepository,
      repositories.transcriptEntryRepository,
      repositories.questionRepository,
      repositories.noteRepository,
      repositories.bookmarkRepository,
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
    listQuestionHistoryUseCase: new ListQuestionHistoryUseCase(
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
      repositories.lectureMaterialRepository,
      repositories.materialChunkRepository,
      repositories.glossaryTermRepository,
      repositories.transcriptEntryRepository,
      repositories.evidenceUnitRepository,
      repositories.uploadedAssetRepository,
    ),
    createNoteUseCase: new CreateNoteUseCase(repositories.noteRepository),
    updateNoteUseCase: new UpdateNoteUseCase(repositories.noteRepository),
    deleteNoteUseCase: new DeleteNoteUseCase(repositories.noteRepository),
    toggleBookmarkUseCase: new ToggleBookmarkUseCase(repositories.bookmarkRepository),
    selectLectureSessionUseCase: new SelectLectureSessionUseCase(ports.selectedSessionStore),
  };
};
