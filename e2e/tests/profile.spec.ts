import { test, expect } from '@playwright/test';

test.describe('Profile Page', () => {
  test('shows sign-in prompt when not authenticated', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: /not signed in/i })).toBeVisible();
  });

  test('has link to login page', async ({ page }) => {
    await page.goto('/profile');
    const loginLink = page.getByRole('link', { name: /sign in/i });
    await expect(loginLink).toBeVisible();
  });
});
