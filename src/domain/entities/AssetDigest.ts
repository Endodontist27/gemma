import { z } from 'zod';

import {
  EntityIdSchema,
  IsoDateTimeSchema,
  NonEmptyTextSchema,
} from '@domain/value-objects/EntityId';

export const AssetDigestKindSchema = z.enum(['asset_summary', 'session_summary']);
export type AssetDigestKind = z.infer<typeof AssetDigestKindSchema>;

export const AssetDigestSchema = z.object({
  id: EntityIdSchema,
  sessionId: EntityIdSchema,
  assetId: EntityIdSchema.nullable(),
  kind: AssetDigestKindSchema,
  title: NonEmptyTextSchema,
  text: NonEmptyTextSchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export type AssetDigest = z.infer<typeof AssetDigestSchema>;
