import { hasGroundedSupport } from '@domain/business-rules/SupportRules';
import type { RetrievalResult } from '@domain/service-contracts/RetrievalService';
import type {
  SupportCheckService,
  SupportDecision,
} from '@domain/service-contracts/SupportCheckService';

export class LocalSupportCheckService implements SupportCheckService {
  async checkSupport(questionText: string, retrieval: RetrievalResult): Promise<SupportDecision> {
    const isSupported = hasGroundedSupport(questionText, retrieval);

    return {
      isSupported,
      reason: isSupported
        ? 'Grounded lecture evidence is available locally.'
        : 'The uploaded lecture evidence does not yet support a reliable grounded answer.',
    };
  }
}
