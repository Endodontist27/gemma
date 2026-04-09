export interface LLMVisualEvidenceInput {
  uri: string;
  caption: string;
}

export interface LLMGenerationInput {
  mode: 'summary' | 'answer';
  instruction: string;
  question?: string;
  evidence: string[];
  visualEvidence?: LLMVisualEvidenceInput[];
}

export interface LLMService {
  generateText(input: LLMGenerationInput): Promise<string>;
}
