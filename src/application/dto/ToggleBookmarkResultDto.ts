import type { Bookmark } from '@domain/entities/Bookmark';

export interface ToggleBookmarkResultDto {
  isBookmarked: boolean;
  bookmark: Bookmark | null;
}
