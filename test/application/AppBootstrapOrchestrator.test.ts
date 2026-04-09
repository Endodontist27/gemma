import { describe, expect, it, vi } from 'vitest';

import { AppBootstrapOrchestrator } from '@application/orchestrators/AppBootstrapOrchestrator';
import { GemmaRuntimeError } from '@domain/service-contracts/GemmaRuntimeError';
import type { GemmaRuntimeStatus } from '@domain/service-contracts/GemmaRuntimeStatus';

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

describe('AppBootstrapOrchestrator', () => {
  it('skips summary generation when the Gemma runtime is unavailable and still restores the workspace', async () => {
    const selectedSessionStore = {
      getSelectedSessionId: vi.fn().mockResolvedValue(null),
      setSelectedSessionId: vi.fn().mockResolvedValue(undefined),
    };
    const session = {
      id: 'session_local',
      title: 'Grounded Retrieval',
      description: 'Offline grounded lecture session.',
      lecturer: 'Dr. Lin',
      courseCode: 'CS-420',
      startsAt: '2026-04-03T09:00:00.000Z',
      location: 'Auditorium A',
      tags: ['grounded', 'mobile'],
      createdAt: '2026-04-03T09:00:00.000Z',
      updatedAt: '2026-04-03T09:00:00.000Z',
    };
    const orchestrator = new AppBootstrapOrchestrator(
      {
        initialize: vi.fn().mockResolvedValue(undefined),
      } as any,
      {
        count: vi.fn().mockResolvedValue(1),
        list: vi.fn().mockResolvedValue([session]),
        findById: vi.fn().mockResolvedValue(session),
        save: vi.fn().mockResolvedValue(undefined),
      } as any,
      {
        listBySession: vi.fn().mockResolvedValue([]),
        saveMany: vi.fn().mockResolvedValue(undefined),
      } as any,
      {
        generateSessionSummaries: vi
          .fn()
          .mockRejectedValue(new GemmaRuntimeError(runtimeUnavailableStatus)),
      } as any,
      {
        getStatus: vi.fn().mockResolvedValue(runtimeUnavailableStatus),
        warmup: vi.fn().mockResolvedValue(undefined),
        isAvailable: vi.fn().mockResolvedValue(false),
        generateText: vi.fn(),
        modelId: 'google/gemma-4-E2B-it',
        provider: 'gemma',
        executionMode: 'local-runtime',
      } as any,
      {
        execute: vi.fn().mockResolvedValue([session]),
      } as any,
      selectedSessionStore as any,
    );

    const result = await orchestrator.execute();

    expect(result.activeSessionId).toBe('session_local');
    expect(selectedSessionStore.setSelectedSessionId).toHaveBeenCalledWith('session_local');
  });
});
