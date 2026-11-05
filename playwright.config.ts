import { defineConfig } from 'playwright/test';
import path from 'path';

const emailTestStoragePath = path.resolve('e2e', '.tmp', 'storage');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Sequential - cache dependencies between tests
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  globalSetup: './e2e/subscribe.global-setup.ts',
  reporter: [['html', { outputFolder: 'e2e-results/html' }], ['list']],
  timeout: 90000, // 90s per test - Claude + Notion can be slow
  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    httpCredentials: { username: 'operator', password: 'email-e2e-operator-secret' },
  },
  webServer: {
    command: 'next dev -p 3000',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      STORAGE_BACKEND: 'local',
      STORAGE_LOCAL_PATH: emailTestStoragePath,
      WAIA_OPERATOR_SECRET: 'email-e2e-operator-secret',
      WAIA_OPERATOR_ID: 'e2e',
    },
  },
});
