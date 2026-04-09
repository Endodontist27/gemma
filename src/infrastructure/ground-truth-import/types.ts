import type { GroundTruthUploadAsset } from '@shared/types/GroundTruthUploadAsset';

export type GroundTruthAssetKind =
  | 'session'
  | 'material'
  | 'glossary'
  | 'transcript'
  | 'summaries'
  | 'categories'
  | 'public_qa';

export interface ClassifiedGroundTruthAsset extends GroundTruthUploadAsset {
  baseName: string;
  extension: string;
  kind: GroundTruthAssetKind;
}

export interface NormalizedGroundTruthAsset
  extends Omit<GroundTruthUploadAsset, 'textContent'> {
  textContent: string;
  baseName: string;
  extension: string;
  kind: GroundTruthAssetKind;
}

export interface PartialSessionMetadata {
  title?: string;
  courseCode?: string;
  lecturer?: string;
  description?: string;
  location?: string;
  startsAt?: string;
  status?: 'scheduled' | 'live' | 'ended';
  tags?: string[];
}
