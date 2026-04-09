export interface GroundTruthUploadAsset {
  name: string;
  mimeType: string | null;
  textContent?: string | null;
  sourceUri?: string | null;
  sizeBytes?: number | null;
  checksum?: string | null;
}
