import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    // Playwright specs live in tests/e2e and are run separately via `npm run test:e2e`.
    exclude: ['**/node_modules/**', '**/tests/e2e/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**'],
    },
  },
});
