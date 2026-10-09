import { defineConfig } from '@playwright/test';

// E2E tests expect the full stack to be running (e.g. `docker compose up -d`).
// Override the URL with E2E_BASE_URL.
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000', trace: 'on-first-retry' },
  reporter: [['list']]
});
