export const appConfig = {
  appName: 'Lecture Companion',
  database: {
    fileName: 'lecture-companion.db',
  },
  demoPack: {
    sourceLabel: 'bundled-demo-pack',
  },
  retrieval: {
    maxSources: 5,
    supportThreshold: 1.1,
  },
} as const;
