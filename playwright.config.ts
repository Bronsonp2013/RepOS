import { defineConfig } from '@playwright/test';
import { chromium } from 'playwright-core';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

dotenv.config({ path: '.env.test', override: false });

// Chromium executable resolution, in order:
//   1. REPOS_E2E_CHROMIUM_PATH, if set (documented in .env.example and README).
//   2. Playwright's own default revision, if that browser is actually
//      installed at config-evaluation time (it may not be: the revision
//      @playwright/test wants can outpace what a prebuilt image carries,
//      and outbound access to cdn.playwright.dev to fetch it is blocked by
//      sandbox egress policy).
//   3. The repo-known fallback location, picking the newest installed
//      chromium-*/chrome-linux/chrome under it.
function resolveChromiumExecutable(): string | undefined {
  if (process.env.REPOS_E2E_CHROMIUM_PATH) {
    return process.env.REPOS_E2E_CHROMIUM_PATH;
  }
  const defaultPath = chromium.executablePath();
  if (defaultPath && fs.existsSync(defaultPath)) {
    return undefined; // let Playwright use its own default resolution
  }
  const fallbackRoot = '/opt/pw-browsers';
  if (fs.existsSync(fallbackRoot)) {
    const candidates = fs
      .readdirSync(fallbackRoot)
      .filter((name) => /^chromium-\d+$/.test(name))
      .map((name) => ({
        name,
        rev: Number(name.slice('chromium-'.length)),
        exe: path.join(fallbackRoot, name, 'chrome-linux', 'chrome'),
      }))
      .filter((c) => fs.existsSync(c.exe))
      .sort((a, b) => b.rev - a.rev);
    if (candidates.length > 0) {
      return candidates[0].exe;
    }
  }
  return undefined;
}

const chromiumExecutablePath = resolveChromiumExecutable();

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
    // See resolveChromiumExecutable() above: REPOS_E2E_CHROMIUM_PATH wins if
    // set, else Playwright's own installed default, else the repo-known
    // fallback under /opt/pw-browsers.
    launchOptions: chromiumExecutablePath ? { executablePath: chromiumExecutablePath } : {},
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
