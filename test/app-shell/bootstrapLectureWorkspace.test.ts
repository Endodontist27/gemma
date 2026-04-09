import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  bootstrapLectureWorkspace,
  resetBootstrapLectureWorkspace,
} from '@/app-shell/bootstrap/bootstrapLectureWorkspace';
import type { AppContainer } from '@/app-shell/bootstrap/types';

const createContainer = (
  execute: () => Promise<{ activeSessionId: string | null }>,
) =>
  ({
    orchestrators: {
      appBootstrapOrchestrator: {
        execute,
      },
    },
  }) as unknown as AppContainer;

describe('bootstrapLectureWorkspace', () => {
  beforeEach(() => {
    resetBootstrapLectureWorkspace();
  });

  it('reuses the in-flight bootstrap promise', async () => {
    let resolveBootstrap!: (result: { activeSessionId: string | null }) => void;
    const execute = vi.fn(
      () =>
        new Promise<{ activeSessionId: string | null }>((resolve) => {
          resolveBootstrap = resolve;
        }),
    );

    const firstCall = bootstrapLectureWorkspace({
      container: createContainer(execute),
    });
    const secondCall = bootstrapLectureWorkspace({
      container: createContainer(execute),
    });

    expect(execute).toHaveBeenCalledTimes(1);

    resolveBootstrap({ activeSessionId: 'session_1' });

    await expect(firstCall).resolves.toEqual({ activeSessionId: 'session_1' });
    await expect(secondCall).resolves.toEqual({ activeSessionId: 'session_1' });
  });

  it('returns the cached bootstrap result after a successful run', async () => {
    const execute = vi.fn().mockResolvedValue({ activeSessionId: 'session_1' });

    await bootstrapLectureWorkspace({
      container: createContainer(execute),
    });
    const cachedResult = await bootstrapLectureWorkspace({
      container: createContainer(vi.fn().mockResolvedValue({ activeSessionId: 'session_2' })),
    });

    expect(execute).toHaveBeenCalledTimes(1);
    expect(cachedResult).toEqual({ activeSessionId: 'session_1' });
  });

  it('clears the cache after a bootstrap failure', async () => {
    const failedExecute = vi.fn().mockRejectedValue(new Error('bootstrap failed'));

    await expect(
      bootstrapLectureWorkspace({
        container: createContainer(failedExecute),
      }),
    ).rejects.toThrow('bootstrap failed');

    const successfulExecute = vi.fn().mockResolvedValue({ activeSessionId: 'session_1' });
    const result = await bootstrapLectureWorkspace({
      container: createContainer(successfulExecute),
    });

    expect(successfulExecute).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ activeSessionId: 'session_1' });
  });
});
