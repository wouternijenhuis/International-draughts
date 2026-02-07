import { test, expect, devices } from '@playwright/test';

test.describe('Responsive Design', () => {
  test('play page works on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/play');
    const board = page.getByRole('grid');
    await expect(board).toBeVisible();
  });

  test('play page works on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/play');
    const board = page.getByRole('grid');
    await expect(board).toBeVisible();
  });

  test('play page works on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/play');
    const board = page.getByRole('grid');
    await expect(board).toBeVisible();
  });
});
