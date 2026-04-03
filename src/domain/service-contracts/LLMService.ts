export interface LLMGenerationInput {
  mode: 'summary' | 'answer';
  instruction: string;
  evidence: string[];
}

export interface LLMService {
  generateText(input: LLMGenerationInput): Promise<string>;
}
