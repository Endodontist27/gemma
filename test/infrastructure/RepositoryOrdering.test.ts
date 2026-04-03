import { describe, expect, it, vi } from 'vitest';

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

const expectQueryOrder = async (
  execute: () => Promise<unknown>,
  findMany: ReturnType<typeof vi.fn>,
) => {
  await execute();
  expect(findMany).toHaveBeenCalledTimes(1);
  expect(findMany.mock.calls[0]?.[0]?.orderBy).toBeDefined();
};

describe('Repository ordering', () => {
  it('configures explicit ordering for query-based list methods', async () => {
    const answerFindMany = vi.fn().mockResolvedValue([]);
    const answerSourceFindMany = vi.fn().mockResolvedValue([]);
    const bookmarkFindMany = vi.fn().mockResolvedValue([]);
    const glossaryFindMany = vi.fn().mockResolvedValue([]);
    const materialFindMany = vi.fn().mockResolvedValue([]);
    const sessionFindMany = vi.fn().mockResolvedValue([]);
    const noteFindMany = vi.fn().mockResolvedValue([]);
    const categoryFindMany = vi.fn().mockResolvedValue([]);
    const questionFindMany = vi.fn().mockResolvedValue([]);
    const summaryFindMany = vi.fn().mockResolvedValue([]);
    const transcriptFindMany = vi.fn().mockResolvedValue([]);

    const db = {
      query: {
        answers: { findMany: answerFindMany },
        answerSources: { findMany: answerSourceFindMany },
        bookmarks: { findMany: bookmarkFindMany },
        glossaryTerms: { findMany: glossaryFindMany },
        lectureMaterials: { findMany: materialFindMany },
        lectureSessions: { findMany: sessionFindMany },
        notes: { findMany: noteFindMany },
        qaCategories: { findMany: categoryFindMany },
        questions: { findMany: questionFindMany },
        summaries: { findMany: summaryFindMany },
        transcriptEntries: { findMany: transcriptFindMany },
      },
      select: vi.fn(),
    } as never;

    await expectQueryOrder(
      () => new DrizzleAnswerRepository(db).listByQuestionIds(['question_1']),
      answerFindMany,
    );
    await expectQueryOrder(
      () => new DrizzleAnswerSourceRepository(db).listByAnswerId('answer_1'),
      answerSourceFindMany,
    );
    await expectQueryOrder(
      () => new DrizzleBookmarkRepository(db).listBySession('session_1'),
      bookmarkFindMany,
    );
    await expectQueryOrder(
      () => new DrizzleGlossaryTermRepository(db).listBySession('session_1'),
      glossaryFindMany,
    );
    await expectQueryOrder(
      () => new DrizzleLectureMaterialRepository(db).listBySession('session_1'),
      materialFindMany,
    );
    await expectQueryOrder(() => new DrizzleLectureSessionRepository(db).list(), sessionFindMany);
    await expectQueryOrder(
      () => new DrizzleNoteRepository(db).listBySession('session_1'),
      noteFindMany,
    );
    await expectQueryOrder(
      () => new DrizzleQACategoryRepository(db).listBySession('session_1'),
      categoryFindMany,
    );
    await expectQueryOrder(
      () => new DrizzleQuestionRepository(db).listBySession('session_1'),
      questionFindMany,
    );
    await expectQueryOrder(
      () => new DrizzleSummaryRepository(db).listBySession('session_1'),
      summaryFindMany,
    );
    await expectQueryOrder(
      () => new DrizzleTranscriptEntryRepository(db).listBySession('session_1'),
      transcriptFindMany,
    );
  });

  it('orders material chunks by material and chunk order for session-wide reads', async () => {
    const orderBy = vi.fn().mockResolvedValue([]);
    const where = vi.fn().mockReturnValue({ orderBy });
    const innerJoin = vi.fn().mockReturnValue({ where });
    const from = vi.fn().mockReturnValue({ innerJoin });
    const select = vi.fn().mockReturnValue({ from });
    const materialChunkFindMany = vi.fn().mockResolvedValue([]);
    const db = {
      select,
      query: {
        materialChunks: { findMany: materialChunkFindMany },
      },
    } as never;
    const repository = new DrizzleMaterialChunkRepository(db);

    await repository.listBySession('session_1');
    await repository.listByMaterial('material_1');

    expect(orderBy).toHaveBeenCalledTimes(1);
    expect(materialChunkFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: expect.anything(),
      }),
    );
  });

  it('orders answer sources consistently for multi-answer reads', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const db = {
      query: {
        answerSources: { findMany },
      },
    } as never;

    await new DrizzleAnswerSourceRepository(db).listByAnswerIds(['answer_1', 'answer_2']);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: expect.anything(),
      }),
    );
  });

  it('orders public questions consistently for community reads', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const db = {
      query: {
        questions: { findMany },
      },
    } as never;

    await new DrizzleQuestionRepository(db).listPublicBySession('session_1');

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: expect.anything(),
      }),
    );
  });
});
