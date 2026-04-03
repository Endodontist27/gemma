export interface LocalModelTarget {
  provider: 'gemma';
  family: 'gemma-4';
  modelId: string;
  variant: string;
  tuning: 'instruction';
  executionTarget: 'local-first';
}

export const modelCatalog = {
  gemma4E2BIt: {
    provider: 'gemma',
    family: 'gemma-4',
    modelId: 'google/gemma-4-E2B-it',
    variant: 'E2B-it',
    tuning: 'instruction',
    executionTarget: 'local-first',
  },
} as const satisfies Record<string, LocalModelTarget>;

export const modelConfig = {
  primary: modelCatalog.gemma4E2BIt,
  fallback: {
    strategy: 'mock-local-llm-until-gemma-runtime-is-available',
  },
} as const;

export const primaryModelId = modelConfig.primary.modelId;
