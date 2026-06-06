import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright smoke tests. They run against the dev server (auto-started below).
 * The deep trainer/client flows require a configured Supabase project + a test
 * user; without env they assert the app loads, routes, and stays accessible.
 * See tests/e2e/*.spec.ts and the README "End-to-end tests" section.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    // Grant camera permission so the client performance screen can be smoke-tested.
    permissions: ['camera'],
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
