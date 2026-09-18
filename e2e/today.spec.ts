/**
 * C8 — the Today page end to end against the running API and web server.
 * Owned by the `web` lane. Playwright starts both servers from
 * playwright.config.ts using .env.test.
 * Run by: npm run e2e
 */
import { test, expect } from '@playwright/test';

const LEXINGTON_WEB_URL = 'http://pathfinder.local:3000';

test.describe('Today page (C8)', () => {
  test('renders both venture sections', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('source-lexington')).toBeVisible();
    await expect(page.getByTestId('source-pathfinder')).toBeVisible();
  });

  test('shows the Graham Interiors row with an Open in Pathfinder link to /accounts/48', async ({
    page,
  }) => {
    await page.goto('/');
    const row = page.getByTestId('source-lexington').getByText('Graham Interiors');
    await expect(row).toBeVisible();

    const link = page
      .getByTestId('needs-visit-row-48')
      .getByRole('link', { name: 'Open Graham Interiors in Pathfinder' });
    await expect(link).toHaveAttribute('href', `${LEXINGTON_WEB_URL}/accounts/48`);
  });
});
