import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@trustvault/shared': path.resolve(__dirname, './packages/shared/src'),
      '@trustvault/database': path.resolve(__dirname, './packages/database/src'),
    },
  },
});

