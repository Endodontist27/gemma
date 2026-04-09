export const logDev = (scope: string, message: string, details?: unknown) => {
  const isDevRuntime =
    typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

  if (!isDevRuntime) {
    return;
  }

  if (typeof details === 'undefined') {
    console.warn(`[${scope}] ${message}`);
    return;
  }

  console.warn(`[${scope}] ${message}`, details);
};
