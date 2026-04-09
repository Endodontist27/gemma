import { describe, expect, it, vi } from 'vitest';

import { GetSessionOverviewUseCase } from '@application/use-cases/GetSessionOverviewUseCase';

describe('GetSessionOverviewUseCase', () => {
  it('returns local overview counts and transcript data even when summaries are unavailable', async () => {
    const session = {
      id: 'session_demo',
      title: 'Grounded Retrieval',
      courseCode: 'CS-420',
      lecturer: 'Dr. Lin',
      description: 'Offline grounded lecture session.',
      location: 'Auditorium A',
      startsAt: '2026-04-03T09:00:00.000Z',
      status: 'scheduled',
      sourcePackVersion: '2026.03-demo',
      tags: ['grounded', 'mobile'],
      createdAt: '2026-04-03T09:00:00.000Z',
      updatedAt: '2026-04-03T09:00:00.000Z',
    };

    const transcriptEntries = [
      {
        id: 'transcript_1',
        sessionId: 'session_demo',
        speakerLabel: 'Lecturer',
        text: 'Welcome to grounded retrieval.',
        startedAtSeconds: 5,
        orderIndex: 0,
        createdAt: '2026-04-03T09:00:00.000Z',
      },
      {
        id: 'transcript_2',
        sessionId: 'session_demo',
        speakerLabel: 'Lecturer',
        text: 'We only answer from local evidence.',
        startedAtSeconds: 18,
        orderIndex: 1,
        createdAt: '2026-04-03T09:00:00.000Z',
      },
    ];

    const useCase = new GetSessionOverviewUseCase(
      {
        findById: vi.fn().mockResolvedValue(session),
      } as any,
      {
        listBySession: vi.fn().mockResolvedValue([]),
        saveMany: vi.fn().mockResolvedValue(undefined),
      } as any,
      {
        listBySession: vi.fn().mockResolvedValue([{ id: 'material_1' }]),
      } as any,
      {
        listBySession: vi.fn().mockResolvedValue([{ id: 'chunk_1' }, { id: 'chunk_2' }]),
      } as any,
      {
        listBySession: vi.fn().mockResolvedValue([{ id: 'term_1' }]),
      } as any,
      {
        listBySession: vi.fn().mockResolvedValue(transcriptEntries),
      } as any,
      {
        listPublicBySession: vi.fn().mockResolvedValue([{ id: 'public_question_1' }]),
      } as any,
      {
        listBySession: vi.fn().mockResolvedValue([{ id: 'note_1' }, { id: 'note_2' }]),
      } as any,
      {
        listBySession: vi.fn().mockResolvedValue([{ id: 'bookmark_1' }]),
      } as any,
      {
        generateSessionSummaries: vi.fn().mockResolvedValue([]),
      } as any,
    );

    const result = await useCase.execute('session_demo');

    expect(result).toMatchObject({
      session,
      counts: {
        materialCount: 1,
        chunkCount: 2,
        glossaryTermCount: 1,
        transcriptEntryCount: 2,
        publicQuestionCount: 1,
        noteCount: 2,
        bookmarkCount: 1,
      },
    });
    expect(result?.transcriptEntries).toEqual(transcriptEntries);
    expect(result?.latestTranscriptEntries).toEqual(transcriptEntries);
  });
});
