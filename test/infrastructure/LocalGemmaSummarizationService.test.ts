import { describe, expect, it, vi } from 'vitest';

import { GemmaRuntimeError } from '@domain/service-contracts/GemmaRuntimeError';
import type { GemmaRuntimeStatus } from '@domain/service-contracts/GemmaRuntimeStatus';
import { LocalGemmaSummarizationService } from '@infrastructure/gemma-runtime/LocalGemmaSummarizationService';

const runtimeUnavailableStatus: GemmaRuntimeStatus = {
  code: 'artifact_missing',
  modelId: 'google/gemma-4-E2B-it',
  executionMode: 'local-runtime',
  sourcePresent: true,
  artifactPresent: false,
  bundledAssetPresent: false,
  deviceModelPresent: false,
  message: 'artifact missing',
};

describe('LocalGemmaSummarizationService', () => {
  it('falls back to a grounded local summary when Gemma is unavailable', async () => {
    const service = new LocalGemmaSummarizationService(
      {
        listBySession: vi.fn().mockResolvedValue([
          {
            id: 'chunk_1',
            sessionId: 'session_demo',
            materialId: 'material_1',
            heading: 'Why grounding matters',
            text: 'Grounding constrains answers to verified lecture sources and reduces hallucination.',
            keywords: ['grounding', 'evidence'],
            orderIndex: 0,
            createdAt: '2026-04-03T09:00:00.000Z',
          },
          {
            id: 'chunk_2',
            sessionId: 'session_demo',
            materialId: 'material_1',
            heading: 'Source priority',
            text: 'The app should prefer glossary definitions before materials and transcript excerpts.',
            keywords: ['glossary', 'materials', 'transcript'],
            orderIndex: 1,
            createdAt: '2026-04-03T09:00:00.000Z',
          },
        ]),
      } as any,
      {
        listBySession: vi.fn().mockResolvedValue([
          {
            id: 'transcript_1',
            sessionId: 'session_demo',
            speakerLabel: 'Dr. Chen',
            text: 'The audience assistant is constrained to the lecture pack on the device.',
            startedAtSeconds: 15,
            orderIndex: 0,
            createdAt: '2026-04-03T09:00:00.000Z',
          },
        ]),
      } as any,
      {
        generateText: vi.fn().mockRejectedValue(new GemmaRuntimeError(runtimeUnavailableStatus)),
      } as any,
    );

    const summaries = await service.generateSessionSummaries('session_demo');

    expect(summaries).toHaveLength(3);
    expect(summaries[0]).toMatchObject({
      kind: 'overview',
      title: 'Session overview',
    });
    expect(summaries[0]?.text).toContain('The session focuses on');
    expect(summaries[1]?.text).toBe('Why grounding matters and Source priority');
    expect(summaries[2]?.text).toContain('Review');
    expect(summaries[2]?.text).toContain('local lecture evidence');
  });

  it('returns clear local summary guidance when a session has no lecture evidence yet', async () => {
    const service = new LocalGemmaSummarizationService(
      {
        listBySession: vi.fn().mockResolvedValue([]),
      } as any,
      {
        listBySession: vi.fn().mockResolvedValue([]),
      } as any,
      {
        generateText: vi.fn().mockResolvedValue(''),
      } as any,
    );

    const summaries = await service.generateSessionSummaries('session_empty');

    expect(summaries).toHaveLength(3);
    expect(summaries[0]?.text).toContain('does not include enough imported lecture material or transcript evidence');
    expect(summaries[1]?.text).toBe('Import lecture materials to extract key points for this session.');
    expect(summaries[2]?.text).toContain('Import lecture materials');
  });
});
