import type { AnswerSource } from '@domain/entities/AnswerSource';
import type { Bookmark } from '@domain/entities/Bookmark';
import type { LectureSession } from '@domain/entities/LectureSession';
import type { Note } from '@domain/entities/Note';
import type { AnswerRepository } from '@domain/repository-contracts/AnswerRepository';
import type { AnswerSourceRepository } from '@domain/repository-contracts/AnswerSourceRepository';
import type { AssetDigestRepository } from '@domain/repository-contracts/AssetDigestRepository';
import type { BookmarkRepository } from '@domain/repository-contracts/BookmarkRepository';
import type { EvidenceUnitRepository } from '@domain/repository-contracts/EvidenceUnitRepository';
import type { GlossaryTermRepository } from '@domain/repository-contracts/GlossaryTermRepository';
import type { LectureMaterialRepository } from '@domain/repository-contracts/LectureMaterialRepository';
import type { LectureSessionRepository } from '@domain/repository-contracts/LectureSessionRepository';
import type { MaterialChunkRepository } from '@domain/repository-contracts/MaterialChunkRepository';
import type { NoteRepository } from '@domain/repository-contracts/NoteRepository';
import type { QACategoryRepository } from '@domain/repository-contracts/QACategoryRepository';
import type { QuestionRepository } from '@domain/repository-contracts/QuestionRepository';
import type { SummaryRepository } from '@domain/repository-contracts/SummaryRepository';
import type { TranscriptEntryRepository } from '@domain/repository-contracts/TranscriptEntryRepository';
import type { UploadedAssetRepository } from '@domain/repository-contracts/UploadedAssetRepository';
import type { LecturePackSessionGraph, PreparedPublicQuestion } from '@infrastructure/lecture-pack/import/types';
import { nowIso } from '@shared/utils/dates';
import { createEntityId } from '@shared/utils/ids';
import { normalizeText, uniqueStrings } from '@shared/utils/text';

import type { GroundTruthSessionAppender } from './GroundTruthSessionAppender';

interface ConsolidatorDependencies {
  lectureSessionRepository: LectureSessionRepository;
  lectureMaterialRepository: LectureMaterialRepository;
  materialChunkRepository: MaterialChunkRepository;
  glossaryTermRepository: GlossaryTermRepository;
  transcriptEntryRepository: TranscriptEntryRepository;
  summaryRepository: SummaryRepository;
  qaCategoryRepository: QACategoryRepository;
  questionRepository: QuestionRepository;
  answerRepository: AnswerRepository;
  answerSourceRepository: AnswerSourceRepository;
  uploadedAssetRepository: UploadedAssetRepository;
  evidenceUnitRepository: EvidenceUnitRepository;
  assetDigestRepository: AssetDigestRepository;
  noteRepository: NoteRepository;
  bookmarkRepository: BookmarkRepository;
  sessionAppender: GroundTruthSessionAppender;
}

const remapAnswerSources = (
  sources: AnswerSource[],
  glossaryIdMap: Map<string, string>,
  evidenceUnitIdMap: Map<string, string>,
): AnswerSource[] =>
  sources.map((source) => {
    if (source.sourceType === 'glossary_term') {
      return {
        ...source,
        sourceRecordId: glossaryIdMap.get(source.sourceRecordId) ?? source.sourceRecordId,
      };
    }

    if (source.sourceType === 'evidence_unit') {
      return {
        ...source,
        sourceRecordId: evidenceUnitIdMap.get(source.sourceRecordId) ?? source.sourceRecordId,
      };
    }

    return source;
  });

const remapNote = (
  note: Note,
  targetSessionId: string,
  glossaryIdMap: Map<string, string>,
  evidenceUnitIdMap: Map<string, string>,
): Note => {
  if (note.anchorType === 'glossary_term' && note.anchorId) {
    return {
      ...note,
      sessionId: targetSessionId,
      anchorId: glossaryIdMap.get(note.anchorId) ?? note.anchorId,
    };
  }

  if (note.anchorType === 'evidence_unit' && note.anchorId) {
    return {
      ...note,
      sessionId: targetSessionId,
      anchorId: evidenceUnitIdMap.get(note.anchorId) ?? note.anchorId,
    };
  }

  return {
    ...note,
    sessionId: targetSessionId,
  };
};

const remapBookmark = (
  bookmark: Bookmark,
  targetSessionId: string,
  glossaryIdMap: Map<string, string>,
  evidenceUnitIdMap: Map<string, string>,
): Bookmark => {
  if (bookmark.targetType === 'glossary_term') {
    return {
      ...bookmark,
      sessionId: targetSessionId,
      targetId: glossaryIdMap.get(bookmark.targetId) ?? bookmark.targetId,
    };
  }

  if (bookmark.targetType === 'evidence_unit') {
    return {
      ...bookmark,
      sessionId: targetSessionId,
      targetId: evidenceUnitIdMap.get(bookmark.targetId) ?? bookmark.targetId,
    };
  }

  return {
    ...bookmark,
    sessionId: targetSessionId,
  };
};

export class SingleSessionWorkspaceConsolidator {
  constructor(private readonly dependencies: ConsolidatorDependencies) {}

  async consolidate(preferredSessionId?: string | null) {
    const sessions = await this.dependencies.lectureSessionRepository.list();
    if (sessions.length <= 1) {
      return sessions;
    }

    let targetSession =
      sessions.find((session) => session.id === preferredSessionId) ??
      sessions[0] ??
      null;

    if (!targetSession) {
      return [];
    }

    const sessionsToMerge = sessions.filter((session) => session.id !== targetSession.id);

    for (const sourceSession of sessionsToMerge) {
      targetSession = await this.mergeSessionIntoTarget(sourceSession, targetSession);
    }

    return [targetSession];
  }

  private async mergeSessionIntoTarget(sourceSession: LectureSession, targetSession: LectureSession) {
    const targetGlossary = await this.dependencies.glossaryTermRepository.listBySession(targetSession.id);
    const sourceGlossary = await this.dependencies.glossaryTermRepository.listBySession(sourceSession.id);
    const glossaryIdMap = new Map<string, string>();
    const targetGlossaryByTerm = new Map(
      targetGlossary.map((term) => [normalizeText(term.term), term.id]),
    );

    for (const term of sourceGlossary) {
      const targetGlossaryId = targetGlossaryByTerm.get(normalizeText(term.term));
      if (targetGlossaryId) {
        glossaryIdMap.set(term.id, targetGlossaryId);
      }
    }

    const evidenceUnitIdMap = await this.migrateIndexedAssets(sourceSession.id, targetSession.id);
    const graph = await this.buildGraph(
      sourceSession,
      targetSession,
      sourceGlossary,
      glossaryIdMap,
      evidenceUnitIdMap,
    );
    const mergedSession = await this.dependencies.sessionAppender.appendToSession(
      graph,
      targetSession,
    );

    await this.refreshSessionDigest(targetSession.id);
    await this.migrateNotes(sourceSession.id, targetSession.id, glossaryIdMap, evidenceUnitIdMap);
    await this.migrateBookmarks(
      sourceSession.id,
      targetSession.id,
      glossaryIdMap,
      evidenceUnitIdMap,
    );
    await this.dependencies.lectureSessionRepository.deleteById(sourceSession.id);

    return mergedSession;
  }

  private async buildGraph(
    sourceSession: LectureSession,
    targetSession: LectureSession,
    sourceGlossary: Awaited<ReturnType<GlossaryTermRepository['listBySession']>>,
    glossaryIdMap: Map<string, string>,
    evidenceUnitIdMap: Map<string, string>,
  ): Promise<LecturePackSessionGraph> {
    const [
      materials,
      chunks,
      transcript,
      summaries,
      categories,
      questions,
    ] = await Promise.all([
      this.dependencies.lectureMaterialRepository.listBySession(sourceSession.id),
      this.dependencies.materialChunkRepository.listBySession(sourceSession.id),
      this.dependencies.transcriptEntryRepository.listBySession(sourceSession.id),
      this.dependencies.summaryRepository.listBySession(sourceSession.id),
      this.dependencies.qaCategoryRepository.listBySession(sourceSession.id),
      this.dependencies.questionRepository.listBySession(sourceSession.id),
    ]);
    const answers = await this.dependencies.answerRepository.listByQuestionIds(
      questions.map((question) => question.id),
    );
    const sources = await this.dependencies.answerSourceRepository.listByAnswerIds(
      answers.map((answer) => answer.id),
    );
    const answersByQuestionId = new Map(answers.map((answer) => [answer.questionId, answer]));
    const sourcesByAnswerId = new Map<string, AnswerSource[]>();

    for (const source of remapAnswerSources(sources, glossaryIdMap, evidenceUnitIdMap)) {
      const existingSources = sourcesByAnswerId.get(source.answerId) ?? [];
      existingSources.push(source);
      sourcesByAnswerId.set(source.answerId, existingSources);
    }

    const preparedQuestions: PreparedPublicQuestion[] = questions.flatMap((question) => {
      const answer = answersByQuestionId.get(question.id);
      if (!answer) {
        return [];
      }

      return [
        {
          question: {
            ...question,
            sessionId: targetSession.id,
          },
          answer: {
            ...answer,
            sessionId: targetSession.id,
          },
          sources: (sourcesByAnswerId.get(answer.id) ?? []).map((source) => ({
            ...source,
            sessionId: targetSession.id,
          })),
        },
      ];
    });

    return {
      session: {
        ...targetSession,
        tags: uniqueStrings([...targetSession.tags, ...sourceSession.tags]),
        updatedAt: nowIso(),
      },
      materials: materials.map((material) => ({
        ...material,
        sessionId: targetSession.id,
      })),
      chunks: chunks.map((chunk) => ({
        ...chunk,
        sessionId: targetSession.id,
      })),
      glossary: sourceGlossary.map((term) => ({
        ...term,
        sessionId: targetSession.id,
      })),
      transcript: transcript.map((entry) => ({
        ...entry,
        sessionId: targetSession.id,
      })),
      summaries: summaries.map((summary) => ({
        ...summary,
        sessionId: targetSession.id,
      })),
      categories: categories.map((category) => ({
        ...category,
        sessionId: targetSession.id,
      })),
      publicQuestions: preparedQuestions,
    };
  }

  private async migrateNotes(
    sourceSessionId: string,
    targetSessionId: string,
    glossaryIdMap: Map<string, string>,
    evidenceUnitIdMap: Map<string, string>,
  ) {
    const notes = await this.dependencies.noteRepository.listBySession(sourceSessionId);
    for (const note of notes) {
      await this.dependencies.noteRepository.save(
        remapNote(note, targetSessionId, glossaryIdMap, evidenceUnitIdMap),
      );
    }
  }

  private async migrateBookmarks(
    sourceSessionId: string,
    targetSessionId: string,
    glossaryIdMap: Map<string, string>,
    evidenceUnitIdMap: Map<string, string>,
  ) {
    const bookmarks = await this.dependencies.bookmarkRepository.listBySession(sourceSessionId);
    for (const bookmark of bookmarks) {
      const remappedBookmark = remapBookmark(
        bookmark,
        targetSessionId,
        glossaryIdMap,
        evidenceUnitIdMap,
      );
      const existingBookmark = await this.dependencies.bookmarkRepository.findByTarget(
        targetSessionId,
        remappedBookmark.targetType,
        remappedBookmark.targetId,
      );

      if (existingBookmark) {
        continue;
      }

      await this.dependencies.bookmarkRepository.save(remappedBookmark);
    }
  }

  private async migrateIndexedAssets(sourceSessionId: string, targetSessionId: string) {
    const sourceAssets = await this.dependencies.uploadedAssetRepository.listBySession(sourceSessionId);
    if (!sourceAssets.length) {
      return new Map<string, string>();
    }

    const targetAssets = await this.dependencies.uploadedAssetRepository.listBySession(targetSessionId);
    const targetAssetByKey = new Map(
      targetAssets.map((asset) => [
        this.buildUploadedAssetKey(asset.fileName, asset.sourceKind),
        asset,
      ]),
    );
    const assetIdMap = new Map<string, string>();
    const evidenceUnitIdMap = new Map<string, string>();

    for (const sourceAsset of sourceAssets) {
      const existingTargetAsset = targetAssetByKey.get(
        this.buildUploadedAssetKey(sourceAsset.fileName, sourceAsset.sourceKind),
      );
      const targetAssetId = existingTargetAsset?.id ?? sourceAsset.id;

      assetIdMap.set(sourceAsset.id, targetAssetId);
      await this.dependencies.uploadedAssetRepository.save({
        ...(existingTargetAsset ?? sourceAsset),
        sessionId: targetSessionId,
        id: targetAssetId,
        mediaType: sourceAsset.mediaType,
        sourceExtension: sourceAsset.sourceExtension,
        checksum: sourceAsset.checksum ?? existingTargetAsset?.checksum ?? null,
        sizeBytes: sourceAsset.sizeBytes ?? existingTargetAsset?.sizeBytes ?? null,
        status: this.mergeUploadedAssetStatus(existingTargetAsset?.status, sourceAsset.status),
        errorMessage: sourceAsset.errorMessage ?? existingTargetAsset?.errorMessage ?? null,
        indexedAt: sourceAsset.indexedAt ?? existingTargetAsset?.indexedAt ?? null,
        updatedAt: nowIso(),
      });

      const sourceUnits = await this.dependencies.evidenceUnitRepository.listByAsset(sourceAsset.id);
      if (sourceUnits.length) {
        await this.dependencies.evidenceUnitRepository.saveMany(
          sourceUnits.map((unit) => {
            evidenceUnitIdMap.set(unit.id, unit.id);
            return {
              ...unit,
              sessionId: targetSessionId,
              assetId: targetAssetId,
            };
          }),
        );
      }

      const sourceDigest = await this.dependencies.assetDigestRepository.findByAsset(sourceAsset.id);
      if (sourceDigest) {
        await this.dependencies.assetDigestRepository.save({
          ...sourceDigest,
          sessionId: targetSessionId,
          assetId: targetAssetId,
          updatedAt: nowIso(),
        });
      }
    }

    return evidenceUnitIdMap;
  }

  private async refreshSessionDigest(sessionId: string) {
    const assetDigests = (await this.dependencies.assetDigestRepository.listBySession(sessionId)).filter(
      (digest) => digest.kind === 'asset_summary' && digest.assetId,
    );

    if (!assetDigests.length) {
      return;
    }

    const timestamp = nowIso();
    await this.dependencies.assetDigestRepository.save({
      id: createEntityId('asset_digest'),
      sessionId,
      assetId: null,
      kind: 'session_summary',
      title: 'Workspace session digest',
      text: assetDigests.map((digest) => `${digest.title}\n${digest.text}`).join('\n\n'),
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  private buildUploadedAssetKey(fileName: string, sourceKind: string) {
    return `${sourceKind}::${normalizeText(fileName)}`;
  }

  private mergeUploadedAssetStatus(existingStatus: string | undefined, incomingStatus: string) {
    const statusPriority = {
      failed: 0,
      pending: 1,
      processing: 2,
      ready: 3,
    } as const;

    if (!existingStatus) {
      return incomingStatus as 'pending' | 'processing' | 'ready' | 'failed';
    }

    return statusPriority[incomingStatus as keyof typeof statusPriority] >=
      statusPriority[existingStatus as keyof typeof statusPriority]
      ? (incomingStatus as 'pending' | 'processing' | 'ready' | 'failed')
      : (existingStatus as 'pending' | 'processing' | 'ready' | 'failed');
  }
}
