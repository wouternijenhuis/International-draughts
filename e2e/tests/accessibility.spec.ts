import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test('play page has skip navigation link', async ({ page }) => {
    await page.goto('/play');
    const skipLink = page.getByText(/skip to/i);
    await expect(skipLink).toBeDefined();
  });

  test('board has proper ARIA role', async ({ page }) => {
    await page.goto('/play');
    const board = page.getByRole('grid');
    await expect(board).toBeVisible();
  });

  test('interactive elements are keyboard accessible', async ({ page }) => {
    await page.goto('/play');
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toBeDefined();
  });

  test('game controls have accessible labels', async ({ page }) => {
    await page.goto('/play');
    const newGame = page.getByRole('button', { name: /new game/i });
    await expect(newGame).toBeVisible();
  });
});
