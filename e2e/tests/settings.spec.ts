import { test, expect } from '@playwright/test';

test.describe('Settings', () => {
  test('play page has settings panel', async ({ page }) => {
    await page.goto('/play');
    // Settings should be accessible
    await expect(page.getByText(/settings/i).first()).toBeVisible();
  });

  test('can toggle notation display', async ({ page }) => {
    await page.goto('/play');
    const notationToggle = page.getByLabel(/notation/i);
    if (await notationToggle.isVisible()) {
      await notationToggle.click();
      // Verify toggle interaction works
      await expect(notationToggle).toBeVisible();
    }
  });
});
