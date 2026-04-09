import type { AppBootstrapResult } from '@application/orchestrators/AppBootstrapOrchestrator';

import type { AppContainer } from '@/app-shell/bootstrap/types';

type BootstrapProgressListener = (message: string) => void;

interface BootstrapLectureWorkspaceInput {
  container: AppContainer;
  onProgress?: BootstrapProgressListener;
}

let bootstrapPromise: Promise<AppBootstrapResult> | null = null;
let lastBootstrapResult: AppBootstrapResult | null = null;

// Expo development remounts can invoke bootstrap multiple times.
// Keep startup single-flight so local import/migration work is not repeated.
export const bootstrapLectureWorkspace = async ({
  container,
  onProgress,
}: BootstrapLectureWorkspaceInput): Promise<AppBootstrapResult> => {
  if (lastBootstrapResult) {
    onProgress?.('Lecture workspace ready.');
    return lastBootstrapResult;
  }

  if (bootstrapPromise) {
    onProgress?.('Resuming local lecture workspace...');
    return bootstrapPromise;
  }

  bootstrapPromise = container.orchestrators.appBootstrapOrchestrator
    .execute(onProgress)
    .then((result) => {
      lastBootstrapResult = result;
      return result;
    })
    .catch((error) => {
      bootstrapPromise = null;
      lastBootstrapResult = null;
      throw error;
    });

  return bootstrapPromise;
};

export const resetBootstrapLectureWorkspace = () => {
  bootstrapPromise = null;
  lastBootstrapResult = null;
};
