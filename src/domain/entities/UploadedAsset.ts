import { z } from 'zod';

import {
  EntityIdSchema,
  IsoDateTimeSchema,
  NonEmptyTextSchema,
} from '@domain/value-objects/EntityId';

export const UploadedAssetStatusSchema = z.enum([
  'pending',
  'processing',
  'ready',
  'failed',
]);
export type UploadedAssetStatus = z.infer<typeof UploadedAssetStatusSchema>;

export const UploadedAssetSchema = z.object({
  id: EntityIdSchema,
  sessionId: EntityIdSchema,
  fileName: NonEmptyTextSchema,
  mediaType: NonEmptyTextSchema,
  sourceKind: z.enum(['material', 'glossary', 'transcript', 'summaries', 'categories', 'public_qa']),
  sourceExtension: NonEmptyTextSchema,
  checksum: z.string().nullable(),
  sizeBytes: z.number().int().nonnegative().nullable(),
  status: UploadedAssetStatusSchema,
  errorMessage: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
  indexedAt: IsoDateTimeSchema.nullable(),
});

export type UploadedAsset = z.infer<typeof UploadedAssetSchema>;
