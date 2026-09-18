import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test', override: false });

const apiPort = Number(process.env.REPOS_API_PORT ?? 3200);
// Distinct from REPOS_WEB_PORT (the `npm run dev` port, 5173 by default) so
// e2e can never reuse a leftover dev server and silently test unbuilt
// source. Vite's own preview default (4173) is used unless overridden.
const webPort = Number(process.env.REPOS_E2E_WEB_PORT ?? 4173);
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
    // downloaded there; that sandbox sets REPOS_E2E_CHROMIUM_PATH to the
    // Chromium build already present in the image. Anywhere else (no
    // override set), fall back to Playwright's own resolution instead of
    // that sandbox-only path, which would not exist.
    launchOptions: process.env.REPOS_E2E_CHROMIUM_PATH
      ? { executablePath: process.env.REPOS_E2E_CHROMIUM_PATH }
      : {},
  },
  webServer: [
    {
      // API against the fixture databases in .env.test (loaded above into
      // process.env, which both child servers inherit). REPOS_WEB_ORIGIN is
      // overridden here to match the e2e preview origin above (webPort),
      // which is intentionally not .env.test's REPOS_WEB_PORT/ORIGIN (the
      // `npm run dev` port) — otherwise CORS would reject the built preview.
      command: 'npm run start -w apps/api',
      url: `http://127.0.0.1:${apiPort}/api/health`,
      // Never reuse an existing process here: a leftover dev API would be
      // running against .env's real source credentials rather than the
      // fixture databases in .env.test this suite expects.
      reuseExistingServer: false,
      timeout: 60_000,
      env: { ...process.env, REPOS_WEB_ORIGIN: webBaseUrl },
    },
    {
      // Built bundle, not the dev server, so C8 exercises what actually ships.
      // Never reuse an existing server here: this must always be the bundle
      // just built, not a leftover process (dev or otherwise) on this port.
      command: `npm run build -w apps/web && npm run preview -w apps/web -- --port ${webPort} --strictPort`,
      url: webBaseUrl,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
