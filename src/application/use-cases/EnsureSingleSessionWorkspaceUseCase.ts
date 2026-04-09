import type { LectureSession } from '@domain/entities/LectureSession';

interface SessionWorkspaceConsolidator {
  consolidate(preferredSessionId?: string | null): Promise<LectureSession[]>;
}

export class EnsureSingleSessionWorkspaceUseCase {
  constructor(private readonly sessionWorkspaceConsolidator: SessionWorkspaceConsolidator) {}

  async execute(preferredSessionId?: string | null) {
    return this.sessionWorkspaceConsolidator.consolidate(preferredSessionId);
  }
}
