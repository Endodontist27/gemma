import type { GroundTruthUploadAsset } from '@shared/types/GroundTruthUploadAsset';

import type { ClassifiedGroundTruthAsset, GroundTruthAssetKind } from './types';

const UNSUPPORTED_BINARY_EXTENSIONS = new Set([
  'ppt',
  'key',
  'doc',
  'docx',
  'xls',
  'xlsx',
]);

const SUPPORTED_EXTENSIONS = new Set([
  'json',
  'txt',
  'md',
  'markdown',
  'csv',
  'pdf',
  'pptx',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'mp4',
  'mov',
  'm4v',
  'avi',
  'webm',
]);

const inferKind = (baseName: string): GroundTruthAssetKind => {
  if (/(^|[_\-\s])(session|metadata|meta)([_\-\s]|$)/.test(baseName)) {
    return 'session';
  }

  if (/(^|[_\-\s])(glossary|terms|definitions)([_\-\s]|$)/.test(baseName)) {
    return 'glossary';
  }

  if (/(^|[_\-\s])(transcript|captions|subtitles)([_\-\s]|$)/.test(baseName)) {
    return 'transcript';
  }

  if (/(^|[_\-\s])(summary|summaries|overview)([_\-\s]|$)/.test(baseName)) {
    return 'summaries';
  }

  if (/(^|[_\-\s])(categories|category)([_\-\s]|$)/.test(baseName)) {
    return 'categories';
  }

  if (/(^|[_\-\s])(publicqa|public_qa|community|qa|q&a|questions)([_\-\s]|$)/.test(baseName)) {
    return 'public_qa';
  }

  return 'material';
};

export const classifyGroundTruthAsset = (
  asset: GroundTruthUploadAsset,
): ClassifiedGroundTruthAsset => {
  const trimmedName = asset.name.trim();
  const extension = trimmedName.includes('.')
    ? trimmedName.split('.').pop()?.toLowerCase() ?? ''
    : '';
  const baseName = trimmedName.replace(/\.[^.]+$/, '').toLowerCase();

  if (UNSUPPORTED_BINARY_EXTENSIONS.has(extension)) {
    throw new Error(
      `${asset.name} is a binary document file that this build does not import locally. Export it to .txt, .md, .csv, .json, or .pptx before uploading it as grounded lecture data.`,
    );
  }

  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new Error(
      `${asset.name} is not a supported grounded-data file. Use .txt, .md, .csv, .json, .pptx, images, videos, or searchable .pdf.`,
    );
  }

  return {
    ...asset,
    baseName,
    extension,
    kind: inferKind(baseName),
  };
};
