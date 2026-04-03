import type { LectureSessionRepository } from '@domain/repository-contracts/LectureSessionRepository';

export class ListLectureSessionsUseCase {
  constructor(private readonly lectureSessionRepository: LectureSessionRepository) {}

  async execute() {
    return this.lectureSessionRepository.list();
  }
}
