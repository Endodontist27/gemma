import { describe, expect, it } from 'vitest';

import type { AnswerSource } from '@domain/entities/AnswerSource';
import type { AssetDigest } from '@domain/entities/AssetDigest';
import type { Bookmark } from '@domain/entities/Bookmark';
import type { EvidenceUnit } from '@domain/entities/EvidenceUnit';
import type { LectureSession } from '@domain/entities/LectureSession';
import type { Note } from '@domain/entities/Note';
import type { UploadedAsset } from '@domain/entities/UploadedAsset';
import { SingleSessionWorkspaceConsolidator } from '@infrastructure/ground-truth-import/SingleSessionWorkspaceConsolidator';
import type { LecturePackSessionGraph } from '@infrastructure/lecture-pack/import/types';

describe('SingleSessionWorkspaceConsolidator', () => {
  it('migrates indexed assets and evidence-unit traceability into the surviving active session', async () => {
    const targetSession: LectureSession = {
      id: 'session_target',
      title: 'Unified workspace',
      courseCode: 'DENT-1',
      lecturer: 'Dr. Demo',
      description: 'Target workspace',
      location: 'Device',
      startsAt: '2026-04-08T10:00:00.000Z',
      status: 'live',
      tags: ['workspace'],
      sourcePackVersion: '1.0.0',
      createdAt: '2026-04-08T10:00:00.000Z',
      updatedAt: '2026-04-08T10:00:00.000Z',
    };
    const sourceSession: LectureSession = {
      ...targetSession,
      id: 'session_source',
      title: 'Imported deck',
      tags: ['imported'],
    };

    const uploadedAssets: UploadedAsset[] = [
      {
        id: 'uploaded_asset_source',
        sessionId: sourceSession.id,
        fileName: 'restorative-slides.pptx',
        mediaType:
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        sourceKind: 'material',
        sourceExtension: 'pptx',
        checksum: 'abc123',
        sizeBytes: 1024,
        status: 'ready',
        errorMessage: null,
        createdAt: '2026-04-08T10:00:00.000Z',
        updatedAt: '2026-04-08T10:00:00.000Z',
        indexedAt: '2026-04-08T10:01:00.000Z',
      },
    ];
    const evidenceUnits: EvidenceUnit[] = [
      {
        id: 'evidence_unit_slide_1',
        sessionId: sourceSession.id,
        assetId: 'uploaded_asset_source',
        sourceType: 'asset',
        sourceRecordId: null,
        modality: 'slide',
        title: 'Slide 1 visual',
        excerpt: 'Deep margin elevation is shown next to the restoration diagram.',
        contentText: 'Deep margin elevation is shown next to the restoration diagram.',
        searchText: 'deep margin elevation restoration diagram',
        pageNumber: null,
        slideNumber: 1,
        frameLabel: null,
        timestampStartSeconds: null,
        timestampEndSeconds: null,
        previewUri: null,
        metadataJson: null,
        createdAt: '2026-04-08T10:01:00.000Z',
      },
    ];
    const assetDigests: AssetDigest[] = [
      {
        id: 'asset_digest_source',
        sessionId: sourceSession.id,
        assetId: 'uploaded_asset_source',
        kind: 'asset_summary',
        title: 'restorative-slides.pptx digest',
        text: 'The slide deck covers deep margin elevation and matrix adaptation.',
        createdAt: '2026-04-08T10:02:00.000Z',
        updatedAt: '2026-04-08T10:02:00.000Z',
      },
    ];
    const notes: Note[] = [
      {
        id: 'note_evidence',
        sessionId: sourceSession.id,
        content: 'Review this slide before the demo.',
        anchorType: 'evidence_unit',
        anchorId: 'evidence_unit_slide_1',
        pinned: false,
        createdAt: '2026-04-08T10:03:00.000Z',
        updatedAt: '2026-04-08T10:03:00.000Z',
      },
    ];
    const bookmarks: Bookmark[] = [
      {
        id: 'bookmark_evidence',
        sessionId: sourceSession.id,
        targetType: 'evidence_unit',
        targetId: 'evidence_unit_slide_1',
        label: 'Slide 1 visual',
        createdAt: '2026-04-08T10:03:00.000Z',
      },
    ];
    const answerSources: AnswerSource[] = [
      {
        id: 'answer_source_1',
        answerId: 'answer_1',
        sessionId: sourceSession.id,
        sourceType: 'evidence_unit',
        sourceRecordId: 'evidence_unit_slide_1',
        label: 'Slide 1 visual',
        excerpt: 'Deep margin elevation is shown next to the restoration diagram.',
        relevanceScore: 1.8,
        createdAt: '2026-04-08T10:04:00.000Z',
      },
    ];

    const sessionGraphCaptures: LecturePackSessionGraph[] = [];

    const consolidator = new SingleSessionWorkspaceConsolidator({
      lectureSessionRepository: {
        list: async () => [targetSession, sourceSession],
        findById: async (id: string) =>
          [targetSession, sourceSession].find((session) => session.id === id) ?? null,
        count: async () => 2,
        save: async () => undefined,
        deleteById: async (id: string) => {
          if (id === sourceSession.id) {
            sourceSession.id = 'deleted_session_source';
          }
        },
        clearAll: async () => undefined,
      },
      lectureMaterialRepository: {
        listBySession: async () => [],
        findById: async () => null,
        saveMany: async () => undefined,
      },
      materialChunkRepository: {
        listBySession: async () => [],
        listByMaterial: async () => [],
        findById: async () => null,
        saveMany: async () => undefined,
      },
      glossaryTermRepository: {
        listBySession: async () => [],
        findById: async () => null,
        saveMany: async () => undefined,
      },
      transcriptEntryRepository: {
        listBySession: async () => [],
        findById: async () => null,
        saveMany: async () => undefined,
      },
      summaryRepository: {
        listBySession: async () => [],
        saveMany: async () => undefined,
      },
      qaCategoryRepository: {
        listBySession: async () => [],
        findByKey: async () => null,
        saveMany: async () => undefined,
      },
      questionRepository: {
        listBySession: async () => [
          {
            id: 'question_1',
            sessionId: sourceSession.id,
            categoryId: null,
            text: 'What is deep margin elevation?',
            normalizedText: 'what is deep margin elevation',
            status: 'supported',
            visibility: 'private',
            origin: 'user_local',
            createdAt: '2026-04-08T10:04:00.000Z',
            updatedAt: '2026-04-08T10:04:00.000Z',
          },
        ],
        listPublicBySession: async () => [],
        findById: async () => null,
        save: async () => undefined,
      },
      answerRepository: {
        findByQuestionId: async () => null,
        listByQuestionIds: async () => [
          {
            id: 'answer_1',
            questionId: 'question_1',
            sessionId: sourceSession.id,
            text: 'Deep margin elevation relocates a deep cervical margin coronally.',
            state: 'grounded',
            confidenceScore: 0.9,
            createdAt: '2026-04-08T10:04:30.000Z',
          },
        ],
        save: async () => undefined,
      },
      answerSourceRepository: {
        listByAnswerId: async () => answerSources,
        listByAnswerIds: async () => answerSources,
        findById: async () => null,
        saveMany: async () => undefined,
      },
      uploadedAssetRepository: {
        listBySession: async (sessionId: string) =>
          uploadedAssets.filter((asset) => asset.sessionId === sessionId),
        findById: async (id: string) => uploadedAssets.find((asset) => asset.id === id) ?? null,
        save: async (asset: UploadedAsset) => {
          const index = uploadedAssets.findIndex((existing) => existing.id === asset.id);
          if (index >= 0) {
            uploadedAssets[index] = asset;
          } else {
            uploadedAssets.push(asset);
          }
        },
        saveMany: async (assets: UploadedAsset[]) => {
          for (const asset of assets) {
            const index = uploadedAssets.findIndex((existing) => existing.id === asset.id);
            if (index >= 0) {
              uploadedAssets[index] = asset;
            } else {
              uploadedAssets.push(asset);
            }
          }
        },
        updateStatus: async () => undefined,
      },
      evidenceUnitRepository: {
        listBySession: async (sessionId: string) =>
          evidenceUnits.filter((unit) => unit.sessionId === sessionId),
        listByAsset: async (assetId: string) =>
          evidenceUnits.filter((unit) => unit.assetId === assetId),
        findById: async (id: string) => evidenceUnits.find((unit) => unit.id === id) ?? null,
        saveMany: async (units: EvidenceUnit[]) => {
          for (const unit of units) {
            const index = evidenceUnits.findIndex((existing) => existing.id === unit.id);
            if (index >= 0) {
              evidenceUnits[index] = unit;
            } else {
              evidenceUnits.push(unit);
            }
          }
        },
        deleteByAsset: async () => undefined,
        search: async () => [],
      },
      assetDigestRepository: {
        listBySession: async (sessionId: string) =>
          assetDigests.filter((digest) => digest.sessionId === sessionId),
        findSessionDigest: async (sessionId: string) =>
          assetDigests.find(
            (digest) => digest.sessionId === sessionId && digest.kind === 'session_summary',
          ) ?? null,
        findByAsset: async (assetId: string) =>
          assetDigests.find((digest) => digest.assetId === assetId) ?? null,
        save: async (digest: AssetDigest) => {
          const index = assetDigests.findIndex((existing) => existing.id === digest.id);
          if (index >= 0) {
            assetDigests[index] = digest;
            return;
          }

          const existingSessionSummaryIndex = assetDigests.findIndex(
            (existing) =>
              existing.sessionId === digest.sessionId &&
              existing.kind === digest.kind &&
              existing.assetId === digest.assetId,
          );
          if (existingSessionSummaryIndex >= 0) {
            assetDigests[existingSessionSummaryIndex] = digest;
            return;
          }

          assetDigests.push(digest);
        },
        saveMany: async () => undefined,
        deleteByAsset: async () => undefined,
      },
      noteRepository: {
        listBySession: async (sessionId: string) =>
          notes.filter((note) => note.sessionId === sessionId),
        save: async (note: Note) => {
          const index = notes.findIndex((existing) => existing.id === note.id);
          if (index >= 0) {
            notes[index] = note;
          } else {
            notes.push(note);
          }
        },
        delete: async () => undefined,
      },
      bookmarkRepository: {
        listBySession: async (sessionId: string) =>
          bookmarks.filter((bookmark) => bookmark.sessionId === sessionId),
        findByTarget: async (
          sessionId: string,
          targetType: Bookmark['targetType'],
          targetId: string,
        ) =>
          bookmarks.find(
            (bookmark) =>
              bookmark.sessionId === sessionId &&
              bookmark.targetType === targetType &&
              bookmark.targetId === targetId,
          ) ?? null,
        save: async (bookmark: Bookmark) => {
          const index = bookmarks.findIndex((existing) => existing.id === bookmark.id);
          if (index >= 0) {
            bookmarks[index] = bookmark;
          } else {
            bookmarks.push(bookmark);
          }
        },
        delete: async () => undefined,
      },
      sessionAppender: {
        appendToSession: async (graph: LecturePackSessionGraph, existingSession: LectureSession) => {
          sessionGraphCaptures.push(graph);
          return {
            ...existingSession,
            tags: Array.from(new Set([...existingSession.tags, ...graph.session.tags])),
            updatedAt: graph.session.updatedAt,
          };
        },
      },
    });

    const consolidatedSessions = await consolidator.consolidate(targetSession.id);

    expect(consolidatedSessions).toHaveLength(1);
    expect(uploadedAssets[0]?.sessionId).toBe(targetSession.id);
    expect(evidenceUnits[0]?.sessionId).toBe(targetSession.id);
    expect(evidenceUnits[0]?.assetId).toBe(uploadedAssets[0]?.id);
    expect(notes[0]?.sessionId).toBe(targetSession.id);
    expect(notes[0]?.anchorId).toBe('evidence_unit_slide_1');
    expect(bookmarks[0]?.sessionId).toBe(targetSession.id);
    expect(bookmarks[0]?.targetId).toBe('evidence_unit_slide_1');
    expect(
      sessionGraphCaptures[0]?.publicQuestions[0]?.sources[0]?.sourceRecordId,
    ).toBe('evidence_unit_slide_1');
    expect(
      assetDigests.some(
        (digest) => digest.sessionId === targetSession.id && digest.kind === 'session_summary',
      ),
    ).toBe(true);
  });
});
