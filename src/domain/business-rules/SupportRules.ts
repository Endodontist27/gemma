import { appConfig } from '@shared/config/appConfig';
import type { RetrievalResult } from '@domain/service-contracts/RetrievalService';

export const hasGroundedSupport = (retrieval: RetrievalResult) =>
  retrieval.matches.length > 0 &&
  retrieval.matches[0].score >= appConfig.retrieval.supportThreshold;
