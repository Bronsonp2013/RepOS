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
  use: {
    baseURL: webBaseUrl,
    trace: 'retain-on-failure',
    // Outbound access to cdn.playwright.dev is blocked by sandbox egress
    // policy, so the newer browser revision @playwright/test wants cannot be
    // downloaded. Use the Chromium build already present in the sandbox
    // image instead of the one browsers.json names.
    launchOptions: {
      executablePath:
        process.env.REPOS_E2E_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    },
  },
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
      // Built bundle, not the dev server, so C8 exercises what actually ships.
      command: `npm run build -w apps/web && npm run preview -w apps/web -- --port ${webPort} --strictPort`,
      url: webBaseUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
