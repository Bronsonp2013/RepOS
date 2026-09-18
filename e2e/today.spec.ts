/**
 * C8 — the Today page end to end against the running API and web server.
 * Owned by the `web` lane. Playwright starts both servers from
 * playwright.config.ts using .env.test.
 * Run by: npm run e2e
 */
import { test } from '@playwright/test';

test.describe('Today page (C8)', () => {
  test('renders both venture sections', async ({ page }) => {
    void page;
    throw new Error('not implemented: assert source-lexington and source-pathfinder sections');
  });

  test('shows the Graham Interiors row with an Open in Pathfinder link to /accounts/48', async ({
    page,
  }) => {
    void page;
    throw new Error('not implemented: assert the link href equals `${webUrl}/accounts/48`');
  });
});
