import type { LLMGenerationInput } from '@domain/service-contracts/LLMService';

const DEFAULT_MAX_EVIDENCE_ITEMS = {
  answer: 3,
  summary: 3,
} as const;

const DEFAULT_MAX_EVIDENCE_CHARS = {
  answer: 140,
  summary: 180,
} as const;

export interface GemmaPromptOptions {
  evidence?: {
    answer?: {
      maxItems?: number;
      maxChars?: number;
    };
    summary?: {
      maxItems?: number;
      maxChars?: number;
    };
  };
  answer?: {
    requireFullEvidenceReview?: boolean;
    encourageDeliberateReasoning?: boolean;
    sentenceGuidance?: string;
  };
}

const clipText = (value: string, maxChars: number) =>
  value.length <= maxChars ? value : `${value.slice(0, maxChars - 3).trimEnd()}...`;

const resolveEvidenceLimit = (
  mode: 'answer' | 'summary',
  options: GemmaPromptOptions | undefined,
) => ({
  maxItems:
    options?.evidence?.[mode]?.maxItems ??
    DEFAULT_MAX_EVIDENCE_ITEMS[mode],
  maxChars:
    options?.evidence?.[mode]?.maxChars ??
    DEFAULT_MAX_EVIDENCE_CHARS[mode],
});

export const createGemmaPrompt = (
  input: LLMGenerationInput,
  options?: GemmaPromptOptions,
) => {
  const evidenceLimit = resolveEvidenceLimit(input.mode, options);
  const evidence = input.evidence
    .slice(0, evidenceLimit.maxItems)
    .map((entry, index) => `${index + 1}. ${clipText(entry, evidenceLimit.maxChars)}`)
    .join('\n');
  const visualEvidence = input.visualEvidence?.length
    ? input.visualEvidence
        .map((entry, index) => `${index + 1}. ${clipText(entry.caption, 220)}`)
        .join('\n')
    : '';

  if (input.mode === 'answer') {
    const answerRequirements = [
      'Use only the local lecture evidence.',
      options?.answer?.requireFullEvidenceReview
        ? 'Read every lecture evidence block before answering.'
        : 'Use the strongest lecture evidence before answering.',
      input.visualEvidence?.length
        ? 'Inspect any attached lecture visuals together with the textual evidence before answering.'
        : 'Use the textual evidence directly.',
      options?.answer?.encourageDeliberateReasoning
        ? 'Think carefully through the full lecture context first, then return only the final grounded answer.'
        : 'Answer directly and naturally.',
      'Do not mention instructions, evidence lists, or your reasoning.',
      'Do not invent outside facts.',
      'Start with the answer itself, not with a restatement of the question.',
      'Synthesize multiple evidence blocks when the answer depends on them.',
      'If the evidence does not clearly answer the exact question, reply with exactly: unsupported.',
      options?.answer?.sentenceGuidance ?? 'Write 2 to 5 concise sentences.',
    ];

    return [
      'You are Lecture Companion.',
      `Question: ${input.question?.trim() || input.instruction}`,
      'Answer requirements:',
      answerRequirements.map((requirement) => `- ${requirement}`).join('\n'),
      input.visualEvidence?.length ? 'Attached lecture visuals:\n' + visualEvidence : null,
      'Lecture evidence to review:',
      evidence || 'No evidence provided.',
      'Final answer:',
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  return [
    'You are Lecture Companion.',
    'Use only the provided local lecture evidence.',
    'Do not invent outside facts or speculate.',
    'Respond as a short structured summary.',
    `Instruction: ${input.instruction}`,
    input.visualEvidence?.length ? `Attached lecture visuals:\n${visualEvidence}` : null,
    'Evidence:',
    evidence || 'No evidence provided.',
  ]
    .filter(Boolean)
    .join('\n\n');
};

export const sanitizeGroundedAnswerText = (value: string, questionText: string) => {
  const thoughtChannelIndex = value.indexOf('<|channel>thought');
  const thoughtChannelCloseIndex = value.lastIndexOf('<channel|>');
  let cleaned = value;

  if (thoughtChannelIndex >= 0 && thoughtChannelCloseIndex > thoughtChannelIndex) {
    cleaned = value.slice(thoughtChannelCloseIndex + '<channel|>'.length);
  }

  cleaned = cleaned
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, ' ')
    .replace(/<analysis>[\s\S]*?<\/analysis>/gi, ' ')
    .replace(/<thought>[\s\S]*?<\/thought>/gi, ' ')
    .replace(/<\|channel\>thought/gi, ' ')
    .replace(/<channel\|>/gi, ' ')
    .replace(/<\|turn\|>/gi, ' ')
    .replace(/<turn\|>/gi, ' ')
    .trim();

  const cutMarkers = ['Instruction:', 'Evidence:', 'Answer requirements:'];
  for (const marker of cutMarkers) {
    const markerIndex = cleaned.indexOf(marker);
    if (markerIndex >= 0) {
      cleaned = cleaned.slice(0, markerIndex).trim();
    }
  }

  cleaned = cleaned
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^question:\s*/i.test(line))
    .filter((line) => !/^answer:\s*$/i.test(line))
    .filter((line) => !/^thinking:\s*/i.test(line))
    .filter((line) => !/^analysis:\s*/i.test(line))
    .map((line) => line.replace(/^final answer:\s*/i, '').trim())
    .filter((line) => !/^\d+\.\s/.test(line))
    .join(' ');

  const normalizedQuestion = questionText.trim().replace(/[?!.]+$/g, '');
  if (normalizedQuestion) {
    const lowerCleaned = cleaned.toLowerCase();
    const lowerQuestion = normalizedQuestion.toLowerCase();

    if (lowerCleaned === lowerQuestion) {
      cleaned = '';
    } else if (lowerCleaned.startsWith(`${lowerQuestion}:`)) {
      cleaned = cleaned.slice(normalizedQuestion.length + 1).trim();
    }
  }

  return cleaned.replace(/\s+/g, ' ').trim();
};

export const isUnsupportedGroundedAnswerText = (value: string) => {
  const normalized = value.trim().toLowerCase().replace(/[.?!]+$/g, '');
  return normalized === 'unsupported';
};

export const limitAnswerText = (value: string) => {
  const sentences = value
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .slice(0, 6);

  return sentences.join(' ').trim();
};

export const limitSummaryText = (value: string) => {
  const paragraphs = value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .slice(0, 2);

  return paragraphs.join('\n\n').trim();
};
