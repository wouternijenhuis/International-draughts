import { test, expect } from '@playwright/test';

test.describe('Tutorial', () => {
  test('tutorial page loads', async ({ page }) => {
    await page.goto('/tutorial');
    await expect(page.getByText(/welcome/i)).toBeVisible();
  });

  test('can navigate through tutorial steps', async ({ page }) => {
    await page.goto('/tutorial');
    
    // First step
    await expect(page.getByText(/Welcome to International Draughts/i)).toBeVisible();
    await expect(page.getByText(/Step 1 of/)).toBeVisible();
    
    // Navigate to next step
    await page.getByRole('button', { name: /next/i }).click();
    await expect(page.getByText(/How Men Move/i)).toBeVisible();
    await expect(page.getByText(/Step 2 of/)).toBeVisible();
  });

  test('previous button is disabled on first step', async ({ page }) => {
    await page.goto('/tutorial');
    const prevButton = page.getByRole('button', { name: /previous/i });
    await expect(prevButton).toBeDisabled();
  });

  test('can navigate to last step and see start playing', async ({ page }) => {
    await page.goto('/tutorial');
    // Click through all steps
    for (let i = 0; i < 5; i++) {
      await page.getByRole('button', { name: /next/i }).click();
    }
    await expect(page.getByText(/Start Playing/i)).toBeVisible();
  });

  test('has skip to game link', async ({ page }) => {
    await page.goto('/tutorial');
    const skipLink = page.getByRole('link', { name: /skip to game/i });
    await expect(skipLink).toBeVisible();
    await expect(skipLink).toHaveAttribute('href', '/play');
  });

  test('shows board visualization on each step', async ({ page }) => {
    await page.goto('/tutorial');
    await expect(page.getByRole('grid')).toBeVisible();
  });
});
