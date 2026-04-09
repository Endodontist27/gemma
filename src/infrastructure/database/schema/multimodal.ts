import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { lectureSessions } from '@infrastructure/database/schema/session';

export const uploadedAssets = sqliteTable(
  'uploaded_assets',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => lectureSessions.id, { onDelete: 'cascade' }),
    fileName: text('file_name').notNull(),
    mediaType: text('media_type').notNull(),
    sourceKind: text('source_kind').notNull(),
    sourceExtension: text('source_extension').notNull(),
    checksum: text('checksum'),
    sizeBytes: integer('size_bytes'),
    status: text('status').notNull(),
    errorMessage: text('error_message'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    indexedAt: text('indexed_at'),
  },
  (table) => [
    index('uploaded_assets_session_idx').on(table.sessionId, table.createdAt),
    index('uploaded_assets_session_file_idx').on(table.sessionId, table.fileName),
    check('uploaded_assets_status_check', sql`${table.status} in ('pending', 'processing', 'ready', 'failed')`),
    check(
      'uploaded_assets_kind_check',
      sql`${table.sourceKind} in ('material', 'glossary', 'transcript', 'summaries', 'categories', 'public_qa')`,
    ),
  ],
);

export const evidenceUnits = sqliteTable(
  'evidence_units',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => lectureSessions.id, { onDelete: 'cascade' }),
    assetId: text('asset_id')
      .notNull()
      .references(() => uploadedAssets.id, { onDelete: 'cascade' }),
    sourceType: text('source_type').notNull(),
    sourceRecordId: text('source_record_id'),
    modality: text('modality').notNull(),
    title: text('title').notNull(),
    excerpt: text('excerpt').notNull(),
    contentText: text('content_text').notNull(),
    searchText: text('search_text').notNull(),
    pageNumber: integer('page_number'),
    slideNumber: integer('slide_number'),
    frameLabel: text('frame_label'),
    timestampStartSeconds: integer('timestamp_start_seconds'),
    timestampEndSeconds: integer('timestamp_end_seconds'),
    previewUri: text('preview_uri'),
    metadataJson: text('metadata_json'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('evidence_units_session_idx').on(table.sessionId, table.assetId),
    index('evidence_units_asset_idx').on(table.assetId, table.createdAt),
    check(
      'evidence_units_source_type_check',
      sql`${table.sourceType} in ('material_chunk', 'glossary_term', 'transcript_entry', 'asset')`,
    ),
    check(
      'evidence_units_modality_check',
      sql`${table.modality} in ('text', 'image', 'video', 'pdf', 'slide')`,
    ),
  ],
);

export const assetDigests = sqliteTable(
  'asset_digests',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => lectureSessions.id, { onDelete: 'cascade' }),
    assetId: text('asset_id').references(() => uploadedAssets.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    title: text('title').notNull(),
    text: text('text').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('asset_digests_session_idx').on(table.sessionId, table.kind),
    uniqueIndex('asset_digests_asset_kind_idx').on(table.assetId, table.kind),
    check('asset_digests_kind_check', sql`${table.kind} in ('asset_summary', 'session_summary')`),
  ],
);
