import { describe, expect, it, vi } from 'vitest';

import type { QACategory } from '@domain/entities/QACategory';
import type { LLMService } from '@domain/service-contracts/LLMService';
import type { RetrievalResult } from '@domain/service-contracts/RetrievalService';
import { LocalGroundedQuestionAnsweringService } from '@infrastructure/gemma-runtime/LocalGroundedQuestionAnsweringService';
import { SessionGroundedContextBuilder } from '@infrastructure/gemma-runtime/SessionGroundedContextBuilder';

const category: QACategory = {
  id: 'category_endodontics',
  sessionId: 'session_endo',
  key: 'endodontics',
  label: 'Endodontics',
  description: 'Endodontic concepts',
  createdAt: '2026-04-04T10:00:00.000Z',
};

const retrieval: RetrievalResult = {
  matches: [
    {
      sourceType: 'glossary_term',
      sourceRecordId: 'glossary_working_length',
      label: 'Glossary: Working length',
      excerpt: 'Working length is the apical extent used during instrumentation and obturation.',
      score: 3,
    },
    {
      sourceType: 'material_chunk',
      sourceRecordId: 'chunk_measurement',
      label: 'Slides: Measurement',
      excerpt: 'Radiographic and electronic apex locator findings are combined to confirm working length.',
      score: 2.4,
    },
    {
      sourceType: 'transcript_entry',
      sourceRecordId: 'transcript_review',
      label: 'Transcript: Review',
      excerpt: 'Maintaining the correct working length prevents over-instrumentation.',
      score: 1.9,
    },
    {
      sourceType: 'material_chunk',
      sourceRecordId: 'chunk_apex_locator',
      label: 'Slides: Apex Locator',
      excerpt: 'Electronic apex locator readings should be cross-checked with radiographs and canal anatomy.',
      score: 1.7,
    },
    {
      sourceType: 'material_chunk',
      sourceRecordId: 'chunk_patency',
      label: 'Slides: Patency',
      excerpt: 'Maintaining patency helps confirm the apical pathway before final working length decisions.',
      score: 1.6,
    },
  ],
};

describe('LocalGroundedQuestionAnsweringService', () => {
  it('passes the explicit user question and the broader reasoning evidence window to the llm', async () => {
    const llmService: LLMService = {
      generateText: vi.fn().mockResolvedValue('Working length is the apical extent used during instrumentation.'),
    };
    const sessionGroundedContextBuilder = {
      buildAnswerEvidence: vi.fn().mockResolvedValue([
        'Focused glossary evidence\n- Working length: Working length is the apical extent used during instrumentation and obturation.',
        'Session lecture material context\n- Measurement: Radiographic and electronic apex locator findings are combined to confirm working length.\n- Apex Locator: Electronic apex locator readings should be cross-checked with radiographs and canal anatomy.\n- Patency: Maintaining patency helps confirm the apical pathway before final working length decisions.',
        'Session transcript context\n- Review at 90s: Maintaining the correct working length prevents over-instrumentation.',
      ]),
    } as Pick<
      SessionGroundedContextBuilder,
      'buildAnswerEvidence'
    > as SessionGroundedContextBuilder;
    const service = new LocalGroundedQuestionAnsweringService(llmService, sessionGroundedContextBuilder);

    await service.answerQuestion('session_endo', 'How is working length confirmed?', retrieval, category);

    expect(sessionGroundedContextBuilder.buildAnswerEvidence).toHaveBeenCalledWith(
      'session_endo',
      'How is working length confirmed?',
      retrieval.matches,
    );
    expect(llmService.generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'answer',
        question: 'How is working length confirmed?',
        evidence: expect.arrayContaining([
          expect.stringContaining('Focused glossary evidence'),
          expect.stringContaining('Session lecture material context'),
          expect.stringContaining('Session transcript context'),
        ]),
      }),
    );
  });

  it('passes focused multimodal evidence text into the llm when relevant lecture visuals are retrieved', async () => {
    const llmService: LLMService = {
      generateText: vi
        .fn()
        .mockResolvedValue('Deep margin elevation raises the margin coronally so restoration isolation and sealing are achievable.'),
    };
    const visualRetrieval: RetrievalResult = {
      matches: [
        {
          sourceType: 'evidence_unit',
          sourceRecordId: 'evidence_slide_8',
          label: 'THE RESTO | Slide 8 visual',
          excerpt: 'Restoration diagram labeling deep margin elevation.',
          score: 2.8,
        },
      ],
    };
    const service = new LocalGroundedQuestionAnsweringService(
      llmService,
      {
        buildAnswerEvidence: vi
          .fn()
          .mockResolvedValue(['Focused multimodal evidence\n- Slide 8: Restoration diagram labeling deep margin elevation.']),
      } as Pick<
        SessionGroundedContextBuilder,
        'buildAnswerEvidence'
      > as SessionGroundedContextBuilder,
    );

    await service.answerQuestion(
      'session_endo',
      'What does the restoration diagram show?',
      visualRetrieval,
      category,
    );

    expect(llmService.generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        evidence: [
          expect.stringContaining('Focused multimodal evidence'),
        ],
      }),
    );
  });

  it('uses the llm for exact definition questions when a grounded answer is available', async () => {
    const llmService: LLMService = {
      generateText: vi
        .fn()
        .mockResolvedValue(
          'Working length is the apical extent used during instrumentation and obturation.',
        ),
    };
    const service = new LocalGroundedQuestionAnsweringService(
      llmService,
      {
        buildAnswerEvidence: vi.fn().mockResolvedValue(retrieval.matches.map((match) => `${match.label}: ${match.excerpt}`)),
      } as Pick<
        SessionGroundedContextBuilder,
        'buildAnswerEvidence'
      > as SessionGroundedContextBuilder,
    );

    const result = await service.answerQuestion('session_endo', 'What is working length?', retrieval, category);

    expect(result.answerText).toBe(
      'Working length is the apical extent used during instrumentation and obturation.',
    );
    expect(llmService.generateText).toHaveBeenCalledOnce();
  });

  it('falls back to a deterministic glossary definition when the model returns unsupported', async () => {
    const llmService: LLMService = {
      generateText: vi.fn().mockResolvedValue('unsupported'),
    };
    const service = new LocalGroundedQuestionAnsweringService(
      llmService,
      {
        buildAnswerEvidence: vi.fn().mockResolvedValue(retrieval.matches.map((match) => `${match.label}: ${match.excerpt}`)),
      } as Pick<
        SessionGroundedContextBuilder,
        'buildAnswerEvidence'
      > as SessionGroundedContextBuilder,
    );

    const result = await service.answerQuestion('session_endo', 'What is working length?', retrieval, category);

    expect(result.supported).toBe(true);
    expect(result.answerText).toBe(
      'Working length is the apical extent used during instrumentation and obturation.',
    );
    expect(llmService.generateText).toHaveBeenCalledOnce();
  });

  it('lets the model decide weak definition evidence instead of short-circuiting before generation', async () => {
    const llmService: LLMService = {
      generateText: vi.fn().mockResolvedValue('unsupported'),
    };
    const weakRetrieval: RetrievalResult = {
      matches: [
        {
          sourceType: 'glossary_term',
          sourceRecordId: 'glossary_bad_access',
          label: 'Glossary: Secondary endodontic infection',
          excerpt: 'structure and seal the access.',
          score: 1.85,
        },
        {
          sourceType: 'material_chunk',
          sourceRecordId: 'chunk_bad_access',
          label: 'Material: Complications',
          excerpt: 'A leaking restoration can compromise the seal and structure around the access.',
          score: 1.5,
        },
      ],
    };
    const service = new LocalGroundedQuestionAnsweringService(
      llmService,
      {
        buildAnswerEvidence: vi
          .fn()
          .mockResolvedValue(weakRetrieval.matches.map((match) => `${match.label}: ${match.excerpt}`)),
      } as Pick<
        SessionGroundedContextBuilder,
        'buildAnswerEvidence'
      > as SessionGroundedContextBuilder,
    );

    const result = await service.answerQuestion('session_endo', 'What is access cavity?', weakRetrieval, category);

    expect(result.supported).toBe(false);
    expect(result.sources).toEqual([]);
    expect(llmService.generateText).toHaveBeenCalledOnce();
  });
});
