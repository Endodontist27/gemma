import { describe, expect, it } from 'vitest';

import {
  createGemmaPrompt,
  isUnsupportedGroundedAnswerText,
  limitAnswerText,
  sanitizeGroundedAnswerText,
} from '@infrastructure/gemma-runtime/prompting';

describe('createGemmaPrompt', () => {
  it('includes the explicit user question in answer prompts', () => {
    const prompt = createGemmaPrompt({
      mode: 'answer',
      question: 'What is working length?',
      instruction:
        'Answer the question using only the grounded lecture evidence. Keep the answer concise, direct, and lecture-specific.',
      evidence: ['Glossary: Working length: The apical extent used during instrumentation.'],
    });

    expect(prompt).toContain('Question: What is working length?');
    expect(prompt).toContain('Final answer:');
    expect(prompt).toContain('Lecture evidence to review:');
    expect(prompt).toContain('reply with exactly: unsupported');
  });

  it('supports a high-reasoning answer prompt profile with a wider evidence window', () => {
    const prompt = createGemmaPrompt(
      {
        mode: 'answer',
        question: 'How is working length confirmed?',
        instruction: 'Answer using only grounded lecture evidence.',
        evidence: [
          'Glossary: Working length: The apical extent used during instrumentation.',
          'Slides: Measurement: Radiographs are combined with apex locator findings.',
          'Transcript: Review: Maintain patency while confirming canal anatomy.',
          'Slides: Apex Locator: Electronic readings should be interpreted in context.',
        ],
      },
      {
        evidence: {
          answer: {
            maxItems: 4,
            maxChars: 500,
          },
        },
        answer: {
          requireFullEvidenceReview: true,
          encourageDeliberateReasoning: true,
          sentenceGuidance: 'Write 3 to 6 grounded sentences.',
        },
      },
    );

    expect(prompt).toContain('Read every lecture evidence block before answering.');
    expect(prompt).toContain('Think carefully through the full lecture context first');
    expect(prompt).toContain('4. Slides: Apex Locator');
  });

  it('mentions attached lecture visuals when visual evidence is present', () => {
    const prompt = createGemmaPrompt({
      mode: 'answer',
      question: 'What does the restoration diagram show?',
      instruction: 'Answer using the uploaded lecture evidence only.',
      evidence: ['Slide visual evidence: The diagram labels deep margin elevation.'],
      visualEvidence: [
        {
          uri: 'data:image/jpeg;base64,abc',
          caption: 'THE RESTO.pptx | Slide 8. Restoration diagram showing deep margin elevation.',
        },
      ],
    });

    expect(prompt).toContain('Attached lecture visuals:');
    expect(prompt).toContain('Inspect any attached lecture visuals together with the textual evidence');
    expect(prompt).toContain('Restoration diagram showing deep margin elevation');
  });
});

describe('sanitizeGroundedAnswerText', () => {
  it('removes echoed prompt scaffolding from model output', () => {
    const cleaned = sanitizeGroundedAnswerText(
      [
        'Working length is the apical extent used during instrumentation.',
        '',
        'Instruction: Answer using only local evidence.',
        'Evidence:',
        '1. Glossary: Working length: The apical extent used during instrumentation.',
      ].join('\n'),
      'What is working length?',
    );

    expect(cleaned).toBe('Working length is the apical extent used during instrumentation.');
  });

  it('removes reasoning tags and final-answer labels from model output', () => {
    const cleaned = sanitizeGroundedAnswerText(
      [
        '<thinking>Compare the glossary and slide evidence before answering.</thinking>',
        'Final answer:',
        'Working length is confirmed by combining apex locator findings with radiographic review.',
      ].join('\n'),
      'How is working length confirmed?',
    );

    expect(cleaned).toBe(
      'Working length is confirmed by combining apex locator findings with radiographic review.',
    );
  });
});

describe('limitAnswerText', () => {
  it('keeps up to six grounded sentences', () => {
    const limited = limitAnswerText(
      'One. Two. Three. Four. Five. Six. Seven.',
    );

    expect(limited).toBe('One. Two. Three. Four. Five. Six.');
  });
});

describe('isUnsupportedGroundedAnswerText', () => {
  it('recognizes the exact unsupported sentinel', () => {
    expect(isUnsupportedGroundedAnswerText('unsupported.')).toBe(true);
    expect(isUnsupportedGroundedAnswerText('Unsupported')).toBe(true);
    expect(isUnsupportedGroundedAnswerText('Unsupported because no evidence was found.')).toBe(false);
  });
});
