import type { AppDatabase } from '@infrastructure/database/client';
import { DrizzleAnswerRepository } from '@infrastructure/repositories/DrizzleAnswerRepository';
import { DrizzleAnswerSourceRepository } from '@infrastructure/repositories/DrizzleAnswerSourceRepository';
import { DrizzleBookmarkRepository } from '@infrastructure/repositories/DrizzleBookmarkRepository';
import { DrizzleGlossaryTermRepository } from '@infrastructure/repositories/DrizzleGlossaryTermRepository';
import { DrizzleLectureMaterialRepository } from '@infrastructure/repositories/DrizzleLectureMaterialRepository';
import { DrizzleLectureSessionRepository } from '@infrastructure/repositories/DrizzleLectureSessionRepository';
import { DrizzleMaterialChunkRepository } from '@infrastructure/repositories/DrizzleMaterialChunkRepository';
import { DrizzleNoteRepository } from '@infrastructure/repositories/DrizzleNoteRepository';
import { DrizzleQACategoryRepository } from '@infrastructure/repositories/DrizzleQACategoryRepository';
import { DrizzleQuestionRepository } from '@infrastructure/repositories/DrizzleQuestionRepository';
import { DrizzleSummaryRepository } from '@infrastructure/repositories/DrizzleSummaryRepository';
import { DrizzleTranscriptEntryRepository } from '@infrastructure/repositories/DrizzleTranscriptEntryRepository';

import type { AppRepositories } from '@app/bootstrap/types';

export const createRepositories = (database: AppDatabase): AppRepositories => ({
  lectureSessionRepository: new DrizzleLectureSessionRepository(database),
  lectureMaterialRepository: new DrizzleLectureMaterialRepository(database),
  materialChunkRepository: new DrizzleMaterialChunkRepository(database),
  glossaryTermRepository: new DrizzleGlossaryTermRepository(database),
  transcriptEntryRepository: new DrizzleTranscriptEntryRepository(database),
  summaryRepository: new DrizzleSummaryRepository(database),
  questionRepository: new DrizzleQuestionRepository(database),
  answerRepository: new DrizzleAnswerRepository(database),
  answerSourceRepository: new DrizzleAnswerSourceRepository(database),
  qaCategoryRepository: new DrizzleQACategoryRepository(database),
  noteRepository: new DrizzleNoteRepository(database),
  bookmarkRepository: new DrizzleBookmarkRepository(database),
});
