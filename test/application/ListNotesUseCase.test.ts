import { describe, expect, it } from 'vitest';

import { ListNotesUseCase } from '@application/use-cases/ListNotesUseCase';

const emptyEvidenceUnitRepository = {
  listBySession: async () => [],
  listByAsset: async () => [],
  findById: async () => null,
  saveMany: async () => undefined,
  deleteByAsset: async () => undefined,
  search: async () => [],
};

const emptyUploadedAssetRepository = {
  listBySession: async () => [],
  findById: async () => null,
  save: async () => undefined,
  saveMany: async () => undefined,
  updateStatus: async () => undefined,
};

describe('ListNotesUseCase', () => {
  it('returns human-readable anchor labels for anchored notes', async () => {
    const useCase = new ListNotesUseCase(
      {
        listBySession: async () => [
          {
            id: 'note_session',
            sessionId: 'session_demo',
            content: 'General note',
            anchorType: 'session',
            anchorId: 'session_demo',
            pinned: false,
            createdAt: '2026-04-04T10:00:00.000Z',
            updatedAt: '2026-04-04T10:00:00.000Z',
          },
          {
            id: 'note_glossary',
            sessionId: 'session_demo',
            content: 'Definition note',
            anchorType: 'glossary_term',
            anchorId: 'glossary_working_length',
            pinned: false,
            createdAt: '2026-04-04T10:01:00.000Z',
            updatedAt: '2026-04-04T10:01:00.000Z',
          },
          {
            id: 'note_chunk',
            sessionId: 'session_demo',
            content: 'Chunk note',
            anchorType: 'material_chunk',
            anchorId: 'chunk_measurement',
            pinned: false,
            createdAt: '2026-04-04T10:02:00.000Z',
            updatedAt: '2026-04-04T10:02:00.000Z',
          },
          {
            id: 'note_transcript',
            sessionId: 'session_demo',
            content: 'Transcript note',
            anchorType: 'transcript_entry',
            anchorId: 'transcript_1',
            pinned: false,
            createdAt: '2026-04-04T10:03:00.000Z',
            updatedAt: '2026-04-04T10:03:00.000Z',
          },
        ],
        save: async () => undefined,
        delete: async () => undefined,
      },
      {
        listBySession: async () => [],
        findByTarget: async () => null,
        save: async () => undefined,
        delete: async () => undefined,
      },
      {
        listBySession: async () => [],
        findById: async () => null,
        saveMany: async () => undefined,
      },
      {
        listBySession: async () => [
          {
            id: 'chunk_measurement',
            sessionId: 'session_demo',
            materialId: 'material_slides',
            heading: 'Measurement',
            text: 'Full chunk text',
            keywords: [],
            orderIndex: 0,
            createdAt: '2026-04-04T10:00:00.000Z',
          },
        ],
        listByMaterial: async () => [],
        findById: async () => null,
        saveMany: async () => undefined,
      },
      {
        listBySession: async () => [
          {
            id: 'glossary_working_length',
            sessionId: 'session_demo',
            term: 'Working length',
            aliases: [],
            definition: 'Definition',
            orderIndex: 0,
            createdAt: '2026-04-04T10:00:00.000Z',
            updatedAt: '2026-04-04T10:00:00.000Z',
          },
        ],
        findById: async () => null,
        saveMany: async () => undefined,
      },
      {
        listBySession: async () => [
          {
            id: 'transcript_1',
            sessionId: 'session_demo',
            speakerLabel: 'Dr. Lin',
            text: 'Transcript text',
            startedAtSeconds: 95,
            orderIndex: 0,
            createdAt: '2026-04-04T10:00:00.000Z',
          },
        ],
        findById: async () => null,
        saveMany: async () => undefined,
      },
      emptyEvidenceUnitRepository,
      emptyUploadedAssetRepository,
    );

    const result = await useCase.execute('session_demo');

    expect(result.notes.find((item) => item.note.id === 'note_session')?.anchorLabel).toBe(
      'Session note',
    );
    expect(result.notes.find((item) => item.note.id === 'note_glossary')?.anchorLabel).toBe(
      'Working length',
    );
    expect(result.notes.find((item) => item.note.id === 'note_chunk')?.anchorLabel).toBe(
      'Measurement',
    );
    expect(result.notes.find((item) => item.note.id === 'note_transcript')?.anchorLabel).toBe(
      'Dr. Lin at 01:35',
    );
  });
});
