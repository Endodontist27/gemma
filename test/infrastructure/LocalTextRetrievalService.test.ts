import { describe, expect, it } from 'vitest';

import { LocalSupportCheckService } from '@infrastructure/mock-llm-services/LocalSupportCheckService';
import { LocalTextRetrievalService } from '@infrastructure/retrieval-engine/LocalTextRetrievalService';
import { appConfig } from '@shared/config/appConfig';

const sessionId = 'session_demo';

describe('LocalTextRetrievalService', () => {
  it('prioritizes glossary matches over material and transcript matches', async () => {
    const retrievalService = new LocalTextRetrievalService(
      {
        listBySession: async () => [
          {
            id: 'glossary_rag',
            sessionId,
            term: 'RAG',
            aliases: ['retrieval augmented generation'],
            definition: 'RAG combines retrieval with generation grounded in local lecture data.',
            orderIndex: 0,
            createdAt: '2026-04-03T09:00:00.000Z',
            updatedAt: '2026-04-03T09:00:00.000Z',
          },
        ],
        saveMany: async () => undefined,
      },
      {
        listBySession: async () => [
          {
            id: 'chunk_rag',
            sessionId,
            materialId: 'material_1',
            heading: 'RAG workflow',
            text: 'RAG uses retrieval before generation.',
            keywords: ['rag', 'retrieval'],
            orderIndex: 0,
            createdAt: '2026-04-03T09:00:00.000Z',
          },
        ],
        listByMaterial: async () => [],
        saveMany: async () => undefined,
      },
      {
        listBySession: async () => [
          {
            id: 'transcript_rag',
            sessionId,
            speakerLabel: 'Dr. Lin',
            text: 'Today we introduce RAG.',
            startedAtSeconds: 30,
            orderIndex: 0,
            createdAt: '2026-04-03T09:00:00.000Z',
          },
        ],
        saveMany: async () => undefined,
      },
    );

    const result = await retrievalService.retrieve(sessionId, 'What does RAG mean?');

    expect(result.matches[0]?.sourceType).toBe('glossary_term');
  });

  it('prioritizes lecture material over transcript when glossary does not match', async () => {
    const retrievalService = new LocalTextRetrievalService(
      {
        listBySession: async () => [],
        saveMany: async () => undefined,
      },
      {
        listBySession: async () => [
          {
            id: 'chunk_local_pack',
            sessionId,
            materialId: 'material_1',
            heading: 'Local lecture packs',
            text: 'Lecture packs keep questions grounded on device.',
            keywords: ['lecture', 'pack', 'grounded'],
            orderIndex: 0,
            createdAt: '2026-04-03T09:00:00.000Z',
          },
        ],
        listByMaterial: async () => [],
        saveMany: async () => undefined,
      },
      {
        listBySession: async () => [
          {
            id: 'transcript_local_pack',
            sessionId,
            speakerLabel: 'Dr. Lin',
            text: 'We keep answers local.',
            startedAtSeconds: 30,
            orderIndex: 0,
            createdAt: '2026-04-03T09:00:00.000Z',
          },
        ],
        saveMany: async () => undefined,
      },
    );

    const result = await retrievalService.retrieve(
      sessionId,
      'How do lecture packs stay grounded?',
    );

    expect(result.matches[0]?.sourceType).toBe('material_chunk');
  });

  it('treats low-scoring retrieval as unsupported', async () => {
    const supportCheckService = new LocalSupportCheckService();
    const result = await supportCheckService.checkSupport('weak evidence', {
      matches: [
        {
          sourceType: 'transcript_entry',
          sourceRecordId: 'transcript_weak',
          label: 'Transcript: Dr. Lin',
          excerpt: 'A passing mention only.',
          score: Number((appConfig.retrieval.supportThreshold - 0.01).toFixed(2)),
        },
      ],
    });

    expect(result.isSupported).toBe(false);
  });
});
