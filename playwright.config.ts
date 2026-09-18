import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test', override: false });

const apiPort = Number(process.env.REPOS_API_PORT ?? 3200);
const webPort = Number(process.env.REPOS_WEB_PORT ?? 5173);
const webBaseUrl = `http://127.0.0.1:${webPort}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: webBaseUrl, trace: 'retain-on-failure' },
  webServer: [
    {
      // API against the fixture databases in .env.test (loaded above into
      // process.env, which both child servers inherit).
      command: 'npm run start -w apps/api',
      url: `http://127.0.0.1:${apiPort}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'npm run dev -w apps/web',
      url: webBaseUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
