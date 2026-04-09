import { describe, expect, it } from 'vitest';

import {
  candidateContainsQuestionFocus,
  computeQuestionFocusBoost,
  extractQuestionFocus,
} from '@infrastructure/retrieval-engine/scoring';

describe('extractQuestionFocus', () => {
  it('extracts the focus phrase from definition-style questions', () => {
    expect(extractQuestionFocus('What is working length?')).toBe('working length');
    expect(extractQuestionFocus('Define apical patency')).toBe('apical patency');
  });
});

describe('computeQuestionFocusBoost', () => {
  it('boosts candidates that contain the focused concept phrase', () => {
    const focused = computeQuestionFocusBoost(
      'What is working length?',
      'Working length is the apical extent used during instrumentation.',
    );
    const unrelated = computeQuestionFocusBoost(
      'What is working length?',
      'NaOCl is the primary irrigant in endodontics.',
    );

    expect(focused).toBeGreaterThan(unrelated);
    expect(focused).toBeGreaterThan(0);
    expect(unrelated).toBe(0);
  });
});

describe('candidateContainsQuestionFocus', () => {
  it('requires the full focused phrase instead of a loose token overlap', () => {
    expect(
      candidateContainsQuestionFocus(
        'What is access cavity?',
        'The opening prepared in a tooth to locate, clean, shape, and fill the root canal system.',
      ),
    ).toBe(false);

    expect(
      candidateContainsQuestionFocus(
        'What is access cavity?',
        'Access cavity. The opening prepared in a tooth to locate, clean, shape, and fill the root canal system.',
      ),
    ).toBe(true);
  });
});
