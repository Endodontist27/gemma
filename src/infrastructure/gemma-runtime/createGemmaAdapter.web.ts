import type { GemmaAdapter } from '@domain/service-contracts/GemmaAdapter';
import { UnsupportedPlatformGemmaAdapter } from '@infrastructure/gemma-runtime/UnsupportedPlatformGemmaAdapter';
import type { LocalModelTarget } from '@shared/config/modelConfig';

export const createGemmaAdapter = (targetModel: LocalModelTarget): GemmaAdapter =>
  new UnsupportedPlatformGemmaAdapter(targetModel);
