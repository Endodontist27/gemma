import type { SelectedSessionStore } from '@application/ports/SelectedSessionStore';

export class SelectLectureSessionUseCase {
  constructor(private readonly selectedSessionStore: SelectedSessionStore) {}

  async execute(sessionId: string | null) {
    await this.selectedSessionStore.setSelectedSessionId(sessionId);
  }
}
