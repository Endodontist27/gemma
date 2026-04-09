import { describe, expect, it, vi } from 'vitest';

import { ClearLocalLectureDataUseCase } from '@application/use-cases/ClearLocalLectureDataUseCase';

describe('ClearLocalLectureDataUseCase', () => {
  it('removes all lecture sessions and clears the selected session', async () => {
    const lectureSessionRepository = {
      count: vi.fn(),
      list: vi.fn(),
      findById: vi.fn(),
      deleteById: vi.fn(async () => undefined),
      clearAll: vi.fn(async () => undefined),
      save: vi.fn(),
    };
    const selectedSessionStore = {
      getSelectedSessionId: vi.fn(),
      setSelectedSessionId: vi.fn(async () => undefined),
    };

    const useCase = new ClearLocalLectureDataUseCase(
      lectureSessionRepository,
      selectedSessionStore,
    );

    await useCase.execute();

    expect(lectureSessionRepository.clearAll).toHaveBeenCalledTimes(1);
    expect(selectedSessionStore.setSelectedSessionId).toHaveBeenCalledWith(null);
  });
});
