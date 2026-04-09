import path from 'node:path';

import { defineConfig } from 'vitest/config';

const root = path.resolve(__dirname);

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(root, 'src'),
      '@app': path.resolve(root, 'src/app'),
      '@presentation': path.resolve(root, 'src/presentation'),
      '@application': path.resolve(root, 'src/application'),
      '@domain': path.resolve(root, 'src/domain'),
      '@infrastructure': path.resolve(root, 'src/infrastructure'),
      '@shared': path.resolve(root, 'src/shared'),
      '@models': path.resolve(root, 'models'),
    },
    extensions: ['.native.ts', '.web.ts', '.ts', '.tsx', '.mjs', '.js', '.jsx', '.json'],
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
