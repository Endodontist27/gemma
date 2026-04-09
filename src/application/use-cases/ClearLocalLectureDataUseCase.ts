import type { SelectedSessionStore } from '@application/ports/SelectedSessionStore';
import type { LectureSessionRepository } from '@domain/repository-contracts/LectureSessionRepository';

export class ClearLocalLectureDataUseCase {
  constructor(
    private readonly lectureSessionRepository: LectureSessionRepository,
    private readonly selectedSessionStore: SelectedSessionStore,
  ) {}

  async execute() {
    await this.lectureSessionRepository.clearAll();
    await this.selectedSessionStore.setSelectedSessionId(null);
  }
}
