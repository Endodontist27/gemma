import type { LecturePackImportService } from '@domain/service-contracts/LecturePackImportService';

export class ImportLecturePackUseCase {
  constructor(private readonly lecturePackImportService: LecturePackImportService) {}

  async execute(rawPack: string, sourceLabel: string) {
    return this.lecturePackImportService.importFromJson(rawPack, sourceLabel);
  }
}
