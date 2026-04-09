import { DrizzleAnswerRepository } from '@infrastructure/repositories/DrizzleAnswerRepository';
import { DrizzleAnswerSourceRepository } from '@infrastructure/repositories/DrizzleAnswerSourceRepository';
import { DrizzleAssetDigestRepository } from '@infrastructure/repositories/DrizzleAssetDigestRepository';
import { DrizzleBookmarkRepository } from '@infrastructure/repositories/DrizzleBookmarkRepository';
import { DrizzleEvidenceUnitRepository } from '@infrastructure/repositories/DrizzleEvidenceUnitRepository';
import { DrizzleGlossaryTermRepository } from '@infrastructure/repositories/DrizzleGlossaryTermRepository';
import { DrizzleLectureMaterialRepository } from '@infrastructure/repositories/DrizzleLectureMaterialRepository';
import { DrizzleLectureSessionRepository } from '@infrastructure/repositories/DrizzleLectureSessionRepository';
import { DrizzleMaterialChunkRepository } from '@infrastructure/repositories/DrizzleMaterialChunkRepository';
import { DrizzleNoteRepository } from '@infrastructure/repositories/DrizzleNoteRepository';
import { DrizzleQACategoryRepository } from '@infrastructure/repositories/DrizzleQACategoryRepository';
import { DrizzleQuestionRepository } from '@infrastructure/repositories/DrizzleQuestionRepository';
import { DrizzleSummaryRepository } from '@infrastructure/repositories/DrizzleSummaryRepository';
import { DrizzleTranscriptEntryRepository } from '@infrastructure/repositories/DrizzleTranscriptEntryRepository';
import { DrizzleUploadedAssetRepository } from '@infrastructure/repositories/DrizzleUploadedAssetRepository';
import type { DatabaseClient } from '@infrastructure/database/client';
import type { AppRepositories } from '@/app-shell/bootstrap/types';

export const createRepositories = (databaseClient: DatabaseClient): AppRepositories => ({
  lectureSessionRepository: new DrizzleLectureSessionRepository(databaseClient.drizzle),
  lectureMaterialRepository: new DrizzleLectureMaterialRepository(databaseClient.drizzle),
  materialChunkRepository: new DrizzleMaterialChunkRepository(databaseClient.drizzle),
  glossaryTermRepository: new DrizzleGlossaryTermRepository(databaseClient.drizzle),
  transcriptEntryRepository: new DrizzleTranscriptEntryRepository(databaseClient.drizzle),
  summaryRepository: new DrizzleSummaryRepository(databaseClient.drizzle),
  questionRepository: new DrizzleQuestionRepository(databaseClient.drizzle),
  answerRepository: new DrizzleAnswerRepository(databaseClient.drizzle),
  answerSourceRepository: new DrizzleAnswerSourceRepository(databaseClient.drizzle),
  qaCategoryRepository: new DrizzleQACategoryRepository(databaseClient.drizzle),
  noteRepository: new DrizzleNoteRepository(databaseClient.drizzle),
  bookmarkRepository: new DrizzleBookmarkRepository(databaseClient.drizzle),
  uploadedAssetRepository: new DrizzleUploadedAssetRepository(databaseClient.drizzle),
  evidenceUnitRepository: new DrizzleEvidenceUnitRepository(databaseClient),
  assetDigestRepository: new DrizzleAssetDigestRepository(databaseClient.drizzle),
});
