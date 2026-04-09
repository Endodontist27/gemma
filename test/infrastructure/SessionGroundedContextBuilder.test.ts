import { describe, expect, it } from 'vitest';

import type { AssetDigestRepository } from '@domain/repository-contracts/AssetDigestRepository';
import type { EvidenceUnitRepository } from '@domain/repository-contracts/EvidenceUnitRepository';
import type { GlossaryTermRepository } from '@domain/repository-contracts/GlossaryTermRepository';
import type { MaterialChunkRepository } from '@domain/repository-contracts/MaterialChunkRepository';
import type { TranscriptEntryRepository } from '@domain/repository-contracts/TranscriptEntryRepository';
import type { UploadedAssetRepository } from '@domain/repository-contracts/UploadedAssetRepository';
import type { RetrievalMatch } from '@domain/service-contracts/RetrievalService';
import { SessionGroundedContextBuilder } from '@infrastructure/gemma-runtime/SessionGroundedContextBuilder';

const glossaryRepository: GlossaryTermRepository = {
  listBySession: async () => [
    {
      id: 'glossary_working_length',
      sessionId: 'session_endo',
      term: 'Working length',
      aliases: ['WL'],
      definition: 'Working length is the apical extent used during instrumentation and obturation.',
      orderIndex: 0,
      createdAt: '2026-04-08T10:00:00.000Z',
      updatedAt: '2026-04-08T10:00:00.000Z',
    },
    {
      id: 'glossary_apical_patency',
      sessionId: 'session_endo',
      term: 'Apical patency',
      aliases: [],
      definition: 'Patency is maintained to confirm the canal pathway and reduce blockage.',
      orderIndex: 1,
      createdAt: '2026-04-08T10:00:00.000Z',
      updatedAt: '2026-04-08T10:00:00.000Z',
    },
  ],
  findById: async () => null,
  saveMany: async () => undefined,
};

const materialChunkRepository: MaterialChunkRepository = {
  listBySession: async () => [
    {
      id: 'chunk_measurement',
      sessionId: 'session_endo',
      materialId: 'material_1',
      heading: 'Measurement',
      text: 'Radiographic and electronic apex locator findings are combined to confirm working length.',
      keywords: ['radiograph', 'apex locator'],
      orderIndex: 0,
      createdAt: '2026-04-08T10:00:00.000Z',
    },
    {
      id: 'chunk_patency',
      sessionId: 'session_endo',
      materialId: 'material_1',
      heading: 'Patency',
      text: 'Maintaining patency helps confirm the apical pathway before final working length decisions.',
      keywords: ['patency'],
      orderIndex: 1,
      createdAt: '2026-04-08T10:00:00.000Z',
    },
  ],
  listByMaterial: async () => [],
  findById: async () => null,
  saveMany: async () => undefined,
};

const transcriptRepository: TranscriptEntryRepository = {
  listBySession: async () => [
    {
      id: 'transcript_review',
      sessionId: 'session_endo',
      speakerLabel: 'Dr. Chen',
      text: 'Maintaining the correct working length prevents over-instrumentation.',
      startedAtSeconds: 90,
      orderIndex: 0,
      createdAt: '2026-04-08T10:00:00.000Z',
    },
  ],
  findById: async () => null,
  saveMany: async () => undefined,
};

const evidenceUnitRepository: EvidenceUnitRepository = {
  listBySession: async () => [
    {
      id: 'evidence_slide_8',
      sessionId: 'session_endo',
      assetId: 'asset_resto_pptx',
      sourceType: 'asset',
      sourceRecordId: null,
      modality: 'slide',
      title: 'THE RESTO | Slide 8 visual',
      excerpt: 'Restoration diagram labeling deep margin elevation.',
      contentText: 'The slide image labels deep margin elevation and the restorative margin relationship.',
      searchText: 'restoration diagram deep margin elevation restorative margin relationship',
      pageNumber: null,
      slideNumber: 8,
      frameLabel: null,
      timestampStartSeconds: null,
      timestampEndSeconds: null,
      previewUri: 'data:image/jpeg;base64,abc',
      metadataJson: null,
      createdAt: '2026-04-08T10:00:00.000Z',
    },
  ],
  listByAsset: async () => [],
  findById: async () => null,
  saveMany: async () => undefined,
  deleteByAsset: async () => undefined,
  search: async () => [],
};

const uploadedAssetRepository: UploadedAssetRepository = {
  listBySession: async () => [
    {
      id: 'asset_resto_pptx',
      sessionId: 'session_endo',
      fileName: 'THE RESTO.pptx',
      mediaType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      sourceKind: 'material',
      sourceExtension: 'pptx',
      checksum: null,
      sizeBytes: 1024,
      status: 'ready',
      errorMessage: null,
      createdAt: '2026-04-08T10:00:00.000Z',
      updatedAt: '2026-04-08T10:00:00.000Z',
      indexedAt: '2026-04-08T10:01:00.000Z',
    },
  ],
  findById: async () => null,
  save: async () => undefined,
  saveMany: async () => undefined,
  updateStatus: async () => undefined,
};

const assetDigestRepository: AssetDigestRepository = {
  listBySession: async () => [],
  findSessionDigest: async () => null,
  findByAsset: async () => null,
  save: async () => undefined,
  saveMany: async () => undefined,
  deleteByAsset: async () => undefined,
};

describe('SessionGroundedContextBuilder', () => {
  it('builds focused evidence plus broader session context from uploaded material', async () => {
    const builder = new SessionGroundedContextBuilder(
      glossaryRepository,
      materialChunkRepository,
      transcriptRepository,
    );
    const retrievalMatches: RetrievalMatch[] = [
      {
        sourceType: 'glossary_term',
        sourceRecordId: 'glossary_working_length',
        label: 'Glossary: Working length',
        excerpt: 'Working length is the apical extent used during instrumentation and obturation.',
        score: 3,
      },
    ];

    const evidence = await builder.buildAnswerEvidence(
      'session_endo',
      'How is working length confirmed?',
      retrievalMatches,
    );

    expect(evidence[0]).toContain('Focused glossary evidence');
    expect(evidence.join('\n')).toContain('Session glossary context');
    expect(evidence.join('\n')).toContain('Apical patency');
    expect(evidence.join('\n')).toContain('Session lecture material context');
    expect(evidence.join('\n')).toContain('Measurement');
    expect(evidence.join('\n')).toContain('Session transcript context');
    expect(evidence.join('\n')).toContain('Dr. Chen');
  });

  it('selects relevant preview-backed visuals for multimodal answer generation', async () => {
    const builder = new SessionGroundedContextBuilder(
      glossaryRepository,
      materialChunkRepository,
      transcriptRepository,
      evidenceUnitRepository,
      assetDigestRepository,
      uploadedAssetRepository,
    );
    const retrievalMatches: RetrievalMatch[] = [
      {
        sourceType: 'evidence_unit',
        sourceRecordId: 'evidence_slide_8',
        label: 'THE RESTO | Slide 8 visual',
        excerpt: 'Restoration diagram labeling deep margin elevation.',
        score: 2.8,
      },
    ];

    const visuals = await builder.buildAnswerVisualEvidence(
      'session_endo',
      'What does the restoration diagram show about deep margin elevation?',
      retrievalMatches,
    );

    expect(visuals).toHaveLength(1);
    expect(visuals[0]?.caption).toContain('Slide 8');
    expect(visuals[0]?.caption).toContain('THE RESTO.pptx');
    expect(visuals[0]?.uri).toContain('data:image/jpeg;base64');
  });
});
