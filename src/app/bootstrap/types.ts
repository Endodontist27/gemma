import type { AppBootstrapOrchestrator } from '@application/orchestrators/AppBootstrapOrchestrator';
import type { LectureExperienceOrchestrator } from '@application/orchestrators/LectureExperienceOrchestrator';
import type { AskLectureQuestionUseCase } from '@application/use-cases/AskLectureQuestionUseCase';
import type { CreateNoteUseCase } from '@application/use-cases/CreateNoteUseCase';
import type { GetSessionOverviewUseCase } from '@application/use-cases/GetSessionOverviewUseCase';
import type { ImportLecturePackUseCase } from '@application/use-cases/ImportLecturePackUseCase';
import type { ListCommunityFeedUseCase } from '@application/use-cases/ListCommunityFeedUseCase';
import type { ListLectureSessionsUseCase } from '@application/use-cases/ListLectureSessionsUseCase';
import type { ListMaterialsUseCase } from '@application/use-cases/ListMaterialsUseCase';
import type { ListNotesUseCase } from '@application/use-cases/ListNotesUseCase';
import type { SelectLectureSessionUseCase } from '@application/use-cases/SelectLectureSessionUseCase';
import type { ToggleBookmarkUseCase } from '@application/use-cases/ToggleBookmarkUseCase';
import type { DatabaseInitializer } from '@application/ports/DatabaseInitializer';
import type { SelectedSessionStore } from '@application/ports/SelectedSessionStore';
import type { TransactionRunner } from '@application/ports/TransactionRunner';
import type { DatabaseClient } from '@infrastructure/database/client';
import type { GemmaAdapter } from '@domain/service-contracts/GemmaAdapter';
import type { LLMService } from '@domain/service-contracts/LLMService';
import type { CategorizationService } from '@domain/service-contracts/CategorizationService';
import type { LecturePackImportService } from '@domain/service-contracts/LecturePackImportService';
import type { QuestionAnsweringService } from '@domain/service-contracts/QuestionAnsweringService';
import type { RetrievalService } from '@domain/service-contracts/RetrievalService';
import type { SummarizationService } from '@domain/service-contracts/SummarizationService';
import type { SupportCheckService } from '@domain/service-contracts/SupportCheckService';
import type { AnswerRepository } from '@domain/repository-contracts/AnswerRepository';
import type { AnswerSourceRepository } from '@domain/repository-contracts/AnswerSourceRepository';
import type { BookmarkRepository } from '@domain/repository-contracts/BookmarkRepository';
import type { GlossaryTermRepository } from '@domain/repository-contracts/GlossaryTermRepository';
import type { LectureMaterialRepository } from '@domain/repository-contracts/LectureMaterialRepository';
import type { LectureSessionRepository } from '@domain/repository-contracts/LectureSessionRepository';
import type { MaterialChunkRepository } from '@domain/repository-contracts/MaterialChunkRepository';
import type { NoteRepository } from '@domain/repository-contracts/NoteRepository';
import type { QACategoryRepository } from '@domain/repository-contracts/QACategoryRepository';
import type { QuestionRepository } from '@domain/repository-contracts/QuestionRepository';
import type { SummaryRepository } from '@domain/repository-contracts/SummaryRepository';
import type { TranscriptEntryRepository } from '@domain/repository-contracts/TranscriptEntryRepository';

export interface AppRepositories {
  lectureSessionRepository: LectureSessionRepository;
  lectureMaterialRepository: LectureMaterialRepository;
  materialChunkRepository: MaterialChunkRepository;
  glossaryTermRepository: GlossaryTermRepository;
  transcriptEntryRepository: TranscriptEntryRepository;
  summaryRepository: SummaryRepository;
  questionRepository: QuestionRepository;
  answerRepository: AnswerRepository;
  answerSourceRepository: AnswerSourceRepository;
  qaCategoryRepository: QACategoryRepository;
  noteRepository: NoteRepository;
  bookmarkRepository: BookmarkRepository;
}

export interface AppPorts {
  selectedSessionStore: SelectedSessionStore;
  databaseInitializer: DatabaseInitializer;
  transactionRunner: TransactionRunner;
}

export interface AppServices {
  lecturePackImportService: LecturePackImportService;
  llmService: LLMService;
  gemmaAdapter: GemmaAdapter;
  retrievalService: RetrievalService;
  summarizationService: SummarizationService;
  categorizationService: CategorizationService;
  supportCheckService: SupportCheckService;
  questionAnsweringService: QuestionAnsweringService;
}

export interface AppUseCases {
  listLectureSessionsUseCase: ListLectureSessionsUseCase;
  importLecturePackUseCase: ImportLecturePackUseCase;
  getSessionOverviewUseCase: GetSessionOverviewUseCase;
  askLectureQuestionUseCase: AskLectureQuestionUseCase;
  listCommunityFeedUseCase: ListCommunityFeedUseCase;
  listMaterialsUseCase: ListMaterialsUseCase;
  listNotesUseCase: ListNotesUseCase;
  createNoteUseCase: CreateNoteUseCase;
  toggleBookmarkUseCase: ToggleBookmarkUseCase;
  selectLectureSessionUseCase: SelectLectureSessionUseCase;
}

export interface AppOrchestrators {
  appBootstrapOrchestrator: AppBootstrapOrchestrator;
  lectureExperienceOrchestrator: LectureExperienceOrchestrator;
}

export interface AppContainer {
  databaseClient: DatabaseClient;
  repositories: AppRepositories;
  ports: AppPorts;
  services: AppServices;
  useCases: AppUseCases;
  orchestrators: AppOrchestrators;
}
