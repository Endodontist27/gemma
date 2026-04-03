import type { LecturePackDto } from '@application/dto/LecturePackDto';
import { LecturePackDtoSchema } from '@application/dto/LecturePackDto';

export const parseLecturePack = (rawPack: string): LecturePackDto =>
  LecturePackDtoSchema.parse(JSON.parse(rawPack)) satisfies LecturePackDto;
