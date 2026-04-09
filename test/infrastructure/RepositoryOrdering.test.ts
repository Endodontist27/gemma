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

const createSelectDbMock = (rows: unknown[] = []) => {
  const orderBy = vi.fn().mockResolvedValue(rows);
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ orderBy, limit });
  const innerJoin = vi.fn().mockReturnValue({ where });
  const from = vi.fn().mockReturnValue({ orderBy, where, innerJoin, limit });
  const select = vi.fn().mockReturnValue({ from });

  return {
    db: {
      select,
    } as never,
    spies: {
      from,
      innerJoin,
      limit,
      orderBy,
      select,
      where,
    },
  };
};

const expectOrderedSelect = async (execute: (db: never) => Promise<unknown>) => {
  const { db, spies } = createSelectDbMock();
  await execute(db);
  expect(spies.orderBy).toHaveBeenCalledTimes(1);
};

describe('Repository ordering', () => {
  it('configures explicit ordering for select-based list methods', async () => {
    await expectOrderedSelect((db: never) =>
      new DrizzleAnswerRepository(db).listByQuestionIds(['question_1']),
    );
    await expectOrderedSelect((db: never) =>
      new DrizzleAnswerSourceRepository(db).listByAnswerId('answer_1'),
    );
    await expectOrderedSelect((db: never) =>
      new DrizzleBookmarkRepository(db).listBySession('session_1'),
    );
    await expectOrderedSelect((db: never) =>
      new DrizzleGlossaryTermRepository(db).listBySession('session_1'),
    );
    await expectOrderedSelect((db: never) =>
      new DrizzleLectureMaterialRepository(db).listBySession('session_1'),
    );
    await expectOrderedSelect((db: never) => new DrizzleLectureSessionRepository(db).list());
    await expectOrderedSelect((db: never) =>
      new DrizzleNoteRepository(db).listBySession('session_1'),
    );
    await expectOrderedSelect((db: never) =>
      new DrizzleQACategoryRepository(db).listBySession('session_1'),
    );
    await expectOrderedSelect((db: never) =>
      new DrizzleQuestionRepository(db).listBySession('session_1'),
    );
    await expectOrderedSelect((db: never) =>
      new DrizzleSummaryRepository(db).listBySession('session_1'),
    );
    await expectOrderedSelect((db: never) =>
      new DrizzleTranscriptEntryRepository(db).listBySession('session_1'),
    );
  });

  it('orders material chunks by material and chunk order for session-wide reads', async () => {
    const { db, spies } = createSelectDbMock();
    const repository = new DrizzleMaterialChunkRepository(db);

    await repository.listBySession('session_1');
    await repository.listByMaterial('material_1');

    expect(spies.innerJoin).toHaveBeenCalledTimes(1);
    expect(spies.orderBy).toHaveBeenCalledTimes(2);
  });

  it('orders answer sources consistently for multi-answer reads', async () => {
    const { db, spies } = createSelectDbMock();

    await new DrizzleAnswerSourceRepository(db).listByAnswerIds(['answer_1', 'answer_2']);

    expect(spies.orderBy).toHaveBeenCalledTimes(1);
  });

  it('orders public questions consistently for community reads', async () => {
    const { db, spies } = createSelectDbMock();

    await new DrizzleQuestionRepository(db).listPublicBySession('session_1');

    expect(spies.orderBy).toHaveBeenCalledTimes(1);
  });
});
