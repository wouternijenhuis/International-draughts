import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('loads the landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/draughts/i);
  });

  test('has navigation to play', async ({ page }) => {
    await page.goto('/');
    const playLink = page.getByRole('link', { name: /play/i });
    await expect(playLink).toBeVisible();
  });

  test('page loads within 3 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(3000);
  });
});
