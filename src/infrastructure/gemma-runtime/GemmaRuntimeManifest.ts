import { z } from 'zod';

import manifestJson from '@models/google/gemma-4-E2B-it/manifest.json';
import { primaryModelId } from '@shared/config/modelConfig';

const GemmaModelManifestSchema = z.object({
  modelId: z.literal(primaryModelId),
  source: z.object({
    relativePath: z.string(),
    present: z.boolean(),
    snapshotSha256: z.string().nullable(),
    files: z.array(z.string()),
    downloadedAt: z.string().nullable(),
  }),
  android: z.object({
    artifactRelativePath: z.string(),
    artifactRepoId: z.string(),
    artifactRepoFilename: z.string(),
    present: z.boolean(),
    artifactSha256: z.string().nullable(),
    deviceModelPath: z.string(),
    conversionProfile: z.object({
      backend: z.literal('llama-cpp-rn-cpu'),
      artifactFormat: z.literal('gguf'),
      quantization: z.string(),
      prefillSeqLen: z.number().int(),
      kvCacheMaxLen: z.number().int(),
    }),
    toolVersions: z.object({
      huggingfaceHub: z.string().nullable(),
      llamaRn: z.string().nullable(),
      llamaCpp: z.string().nullable(),
    }),
    preparedAt: z.string().nullable(),
  }),
});

export type GemmaModelManifest = z.infer<typeof GemmaModelManifestSchema>;

export const gemmaModelManifest = GemmaModelManifestSchema.parse(manifestJson);
