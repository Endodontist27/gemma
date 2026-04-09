export const appConfig = {
  appName: 'Lecture Companion',
  database: {
    fileName: 'lecture-companion.db',
  },
  retrieval: {
    maxSources: 18,
    supportThreshold: 1.0,
  },
  groundedAnswer: {
    maxReasoningSources: 12,
    maxTraceableSources: 6,
  },
} as const;
