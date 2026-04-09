import { describe, expect, it } from 'vitest';

import { GetAnswerSourceDetailUseCase } from '@application/use-cases/GetAnswerSourceDetailUseCase';

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

describe('GetAnswerSourceDetailUseCase', () => {
  it('resolves glossary answer source detail', async () => {
    const useCase = new GetAnswerSourceDetailUseCase(
      {
        findById: async () => ({
          id: 'answer_source_glossary',
          answerId: 'answer_demo',
          sessionId: 'session_demo',
          sourceType: 'glossary_term',
          sourceRecordId: 'glossary_working_length',
          label: 'Glossary: Working length',
          excerpt: 'Distance from a coronal reference point to the planned apical endpoint.',
          relevanceScore: 2.9,
          createdAt: '2026-04-04T10:00:00.000Z',
        }),
        listByAnswerId: async () => [],
        listByAnswerIds: async () => [],
        saveMany: async () => undefined,
      },
      {
        listBySession: async () => [],
        findByTarget: async () => null,
        save: async () => undefined,
        delete: async () => undefined,
      },
      {
        listBySession: async () => [],
        findById: async () => ({
          id: 'glossary_working_length',
          sessionId: 'session_demo',
          term: 'Working length',
          aliases: ['WL'],
          definition: 'Distance from a coronal reference point to the planned apical endpoint.',
          orderIndex: 0,
          createdAt: '2026-04-04T10:00:00.000Z',
          updatedAt: '2026-04-04T10:00:00.000Z',
        }),
        saveMany: async () => undefined,
      },
      {
        listBySession: async () => [],
        listByMaterial: async () => [],
        findById: async () => null,
        saveMany: async () => undefined,
      },
      {
        listBySession: async () => [],
        findById: async () => null,
        saveMany: async () => undefined,
      },
      {
        listBySession: async () => [],
        findById: async () => null,
        saveMany: async () => undefined,
      },
      emptyEvidenceUnitRepository,
      emptyUploadedAssetRepository,
    );

    const result = await useCase.execute('answer_source_glossary');

    expect(result?.sourcePayload.kind).toBe('glossary_term');
    if (!result || result.sourcePayload.kind !== 'glossary_term') {
      throw new Error('Expected glossary detail');
    }

    expect(result.sourcePayload.term).toBe('Working length');
    expect(result.sourcePayload.aliases).toEqual(['WL']);
  });

  it('resolves material chunk detail with parent material title', async () => {
    const useCase = new GetAnswerSourceDetailUseCase(
      {
        findById: async () => ({
          id: 'answer_source_chunk',
          answerId: 'answer_demo',
          sessionId: 'session_demo',
          sourceType: 'material_chunk',
          sourceRecordId: 'chunk_measurement',
          label: 'Material: Measurement',
          excerpt: 'Radiographic and electronic apex locator findings are combined.',
          relevanceScore: 2.1,
          createdAt: '2026-04-04T10:00:00.000Z',
        }),
        listByAnswerId: async () => [],
        listByAnswerIds: async () => [],
        saveMany: async () => undefined,
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
        listBySession: async () => [],
        listByMaterial: async () => [],
        findById: async () => ({
          id: 'chunk_measurement',
          sessionId: 'session_demo',
          materialId: 'material_slides',
          heading: 'Measurement',
          text: 'Full chunk text',
          keywords: ['working length'],
          orderIndex: 0,
          createdAt: '2026-04-04T10:00:00.000Z',
        }),
        saveMany: async () => undefined,
      },
      {
        listBySession: async () => [],
        findById: async () => null,
        saveMany: async () => undefined,
      },
      {
        listBySession: async () => [],
        findById: async () => ({
          id: 'material_slides',
          sessionId: 'session_demo',
          title: 'Lecture slides',
          type: 'slide_deck',
          sourceLabel: 'slides.pdf',
          contentText: 'Overview',
          orderIndex: 0,
          createdAt: '2026-04-04T10:00:00.000Z',
          updatedAt: '2026-04-04T10:00:00.000Z',
        }),
        saveMany: async () => undefined,
      },
      emptyEvidenceUnitRepository,
      emptyUploadedAssetRepository,
    );

    const result = await useCase.execute('answer_source_chunk');

    expect(result?.sourcePayload.kind).toBe('material_chunk');
    if (!result || result.sourcePayload.kind !== 'material_chunk') {
      throw new Error('Expected material chunk detail');
    }

    expect(result.sourcePayload.materialTitle).toBe('Lecture slides');
    expect(result.sourcePayload.heading).toBe('Measurement');
  });

  it('resolves transcript detail with speaker and timestamp', async () => {
    const useCase = new GetAnswerSourceDetailUseCase(
      {
        findById: async () => ({
          id: 'answer_source_transcript',
          answerId: 'answer_demo',
          sessionId: 'session_demo',
          sourceType: 'transcript_entry',
          sourceRecordId: 'transcript_1',
          label: 'Transcript: Dr. Lin',
          excerpt: 'Maintaining working length prevents over-instrumentation.',
          relevanceScore: 1.8,
          createdAt: '2026-04-04T10:00:00.000Z',
        }),
        listByAnswerId: async () => [],
        listByAnswerIds: async () => [],
        saveMany: async () => undefined,
      },
      {
        listBySession: async () => [],
        findByTarget: async () => ({
          id: 'bookmark_transcript',
          sessionId: 'session_demo',
          targetType: 'transcript_entry',
          targetId: 'transcript_1',
          label: 'Dr. Lin transcript',
          createdAt: '2026-04-04T10:00:00.000Z',
        }),
        save: async () => undefined,
        delete: async () => undefined,
      },
      {
        listBySession: async () => [],
        findById: async () => null,
        saveMany: async () => undefined,
      },
      {
        listBySession: async () => [],
        listByMaterial: async () => [],
        findById: async () => null,
        saveMany: async () => undefined,
      },
      {
        listBySession: async () => [],
        findById: async () => ({
          id: 'transcript_1',
          sessionId: 'session_demo',
          speakerLabel: 'Dr. Lin',
          text: 'Maintaining working length prevents over-instrumentation.',
          startedAtSeconds: 95,
          orderIndex: 0,
          createdAt: '2026-04-04T10:00:00.000Z',
        }),
        saveMany: async () => undefined,
      },
      {
        listBySession: async () => [],
        findById: async () => null,
        saveMany: async () => undefined,
      },
      emptyEvidenceUnitRepository,
      emptyUploadedAssetRepository,
    );

    const result = await useCase.execute('answer_source_transcript');

    expect(result?.sourcePayload.kind).toBe('transcript_entry');
    if (!result || result.sourcePayload.kind !== 'transcript_entry') {
      throw new Error('Expected transcript detail');
    }

    expect(result.sourcePayload.speakerLabel).toBe('Dr. Lin');
    expect(result.sourcePayload.startedAtSeconds).toBe(95);
    expect(result.bookmark?.targetType).toBe('transcript_entry');
  });

  it('returns null when the underlying source record is missing', async () => {
    const useCase = new GetAnswerSourceDetailUseCase(
      {
        findById: async () => ({
          id: 'answer_source_missing',
          answerId: 'answer_demo',
          sessionId: 'session_demo',
          sourceType: 'glossary_term',
          sourceRecordId: 'glossary_missing',
          label: 'Glossary: Missing',
          excerpt: 'Missing source',
          relevanceScore: 1.1,
          createdAt: '2026-04-04T10:00:00.000Z',
        }),
        listByAnswerId: async () => [],
        listByAnswerIds: async () => [],
        saveMany: async () => undefined,
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
        listBySession: async () => [],
        listByMaterial: async () => [],
        findById: async () => null,
        saveMany: async () => undefined,
      },
      {
        listBySession: async () => [],
        findById: async () => null,
        saveMany: async () => undefined,
      },
      {
        listBySession: async () => [],
        findById: async () => null,
        saveMany: async () => undefined,
      },
      emptyEvidenceUnitRepository,
      emptyUploadedAssetRepository,
    );

    await expect(useCase.execute('answer_source_missing')).resolves.toBeNull();
  });
});
