export interface LocalModelTarget {
  provider: 'gemma';
  family: 'gemma-4';
  modelId: string;
  variant: string;
  tuning: 'instruction';
  executionTarget: 'local-first';
  repoLocal: {
    manifestPath: string;
    sourcePath: string;
    androidArtifactPath: string;
    deviceModelPath: string;
    bundledAndroidAssetPath: string;
  };
  runtime: {
    backend: 'llama-cpp-rn-cpu';
    artifactFormat: 'gguf';
    strictAndroid: true;
    quantization: string;
    maxContextTokens: number;
    prefillSeqLen: number;
    kvCacheMaxLen: number;
    deviceRequirements: {
      allowEmulator: boolean;
      minTotalMemoryBytes: number;
      recommendedTotalMemoryBytes: number;
      supportedAbis: readonly string[];
    };
    llamaCpp: {
      nBatch: number;
      nUBatch: number;
      nThreads: number;
      nParallel: number;
      nGpuLayers: number;
      forceCpuOnly: boolean;
      useMmap: boolean;
      useMlock: boolean;
      noExtraBufferTypes: boolean;
      cacheTypeK: 'q4_0' | 'q8_0';
      cacheTypeV: 'q4_0' | 'q8_0';
    };
    generation: {
      answer: {
        maxOutputTokens: number;
        temperature: number;
        topK: number;
        topP: number;
      };
      summary: {
        maxOutputTokens: number;
        temperature: number;
        topK: number;
        topP: number;
      };
    };
  };
}

export interface DesktopModelTarget {
  provider: 'gemma';
  family: 'gemma-4';
  modelId: string;
  variant: string;
  tuning: 'instruction';
  executionTarget: 'desktop-local-demo';
  repoLocal: {
    sourcePath: string;
    manifestPath: string;
  };
  runtime: {
    backend: 'transformers-bitsandbytes-cuda';
    recommendedGpu: string;
    defaultQuantization: 'bnb-8bit' | 'bnb-4bit-nf4';
    fallbackQuantization: 'bnb-8bit' | 'bnb-4bit-nf4';
    bridge: {
      host: string;
      port: number;
    };
    maxContextTokens: number;
    reasoning: {
      enableThinkingByDefault: boolean;
      answerEvidence: {
        maxItems: number;
        maxChars: number;
      };
      summaryEvidence: {
        maxItems: number;
        maxChars: number;
      };
    };
    generation: {
      answer: {
        maxOutputTokens: number;
        temperature: number;
        topK: number;
        topP: number;
      };
      summary: {
        maxOutputTokens: number;
        temperature: number;
        topK: number;
        topP: number;
      };
    };
  };
}

export const modelCatalog = {
  gemma4E2BIt: {
    provider: 'gemma',
    family: 'gemma-4',
    modelId: 'google/gemma-4-E2B-it',
    variant: 'E2B-it',
    tuning: 'instruction',
    executionTarget: 'local-first',
    repoLocal: {
      manifestPath: 'models/google/gemma-4-E2B-it/manifest.json',
      sourcePath: 'models/google/gemma-4-E2B-it/source',
      androidArtifactPath: 'models/google/gemma-4-E2B-it/android/gemma-4-E2B-it-Q3_K_S.gguf',
      deviceModelPath: 'lecture-companion/gemma-4-E2B-it-Q3_K_S.gguf',
      bundledAndroidAssetPath: 'embedded-models/gemma-4-E2B-it-Q3_K_S.gguf',
    },
    runtime: {
      backend: 'llama-cpp-rn-cpu',
      artifactFormat: 'gguf',
      strictAndroid: true,
      quantization: 'q3_k_s',
      maxContextTokens: 256,
      prefillSeqLen: 256,
      kvCacheMaxLen: 256,
      deviceRequirements: {
        allowEmulator: false,
        minTotalMemoryBytes: 0,
        recommendedTotalMemoryBytes: 8 * 1024 * 1024 * 1024,
        supportedAbis: ['arm64-v8a'],
      },
      llamaCpp: {
        nBatch: 64,
        nUBatch: 16,
        nThreads: 4,
        nParallel: 1,
        nGpuLayers: 0,
        forceCpuOnly: true,
        useMmap: true,
        useMlock: false,
        noExtraBufferTypes: true,
        cacheTypeK: 'q4_0',
        cacheTypeV: 'q4_0',
      },
      generation: {
        answer: {
          maxOutputTokens: 104,
          temperature: 0.15,
          topK: 24,
          topP: 0.9,
        },
        summary: {
          maxOutputTokens: 96,
          temperature: 0.1,
          topK: 12,
          topP: 0.85,
        },
      },
    },
  },
  gemma4E4BItDesktop: {
    provider: 'gemma',
    family: 'gemma-4',
    modelId: 'google/gemma-4-E4B-it',
    variant: 'E4B-it',
    tuning: 'instruction',
    executionTarget: 'desktop-local-demo',
    repoLocal: {
      sourcePath: 'models/google/gemma-4-E4B-it/source',
      manifestPath: 'models/google/gemma-4-E4B-it/manifest.json',
    },
    runtime: {
      backend: 'transformers-bitsandbytes-cuda',
      recommendedGpu: 'RTX 3060 12 GB or better',
      defaultQuantization: 'bnb-4bit-nf4',
      fallbackQuantization: 'bnb-4bit-nf4',
      bridge: {
        host: '127.0.0.1',
        port: 7860,
      },
      maxContextTokens: 4096,
      reasoning: {
        enableThinkingByDefault: true,
        answerEvidence: {
          maxItems: 12,
          maxChars: 1100,
        },
        summaryEvidence: {
          maxItems: 10,
          maxChars: 900,
        },
      },
      generation: {
        answer: {
          maxOutputTokens: 640,
          temperature: 0.08,
          topK: 24,
          topP: 0.9,
        },
        summary: {
          maxOutputTokens: 448,
          temperature: 0.1,
          topK: 16,
          topP: 0.9,
        },
      },
    },
  },
} as const satisfies Record<string, LocalModelTarget | DesktopModelTarget>;

export const modelConfig = {
  primary: modelCatalog.gemma4E2BIt,
  desktopDemo: modelCatalog.gemma4E4BItDesktop,
  fallback: {
    strategy: 'mock-local-llm-until-gemma-runtime-is-available',
  },
} as const;

export const primaryModelId = modelConfig.primary.modelId;
