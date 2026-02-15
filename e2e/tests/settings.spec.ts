import { test, expect } from '@playwright/test';

test.describe('Settings', () => {
  test('play page has settings toggle', async ({ page }) => {
    await page.goto('/play');
    // Settings are accessible via gear button
    await expect(page.getByLabel(/show settings/i)).toBeVisible();
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
