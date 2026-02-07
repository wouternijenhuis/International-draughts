import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test('guest can navigate to play page without login', async ({ page }) => {
    await page.goto('/play');
    // Should load the play page without redirect
    await expect(page.getByRole('button', { name: /new game/i })).toBeVisible();
  });

  test('login page renders form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('register page renders form', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByLabel('Username')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    await expect(page.getByLabel(/confirm password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
  });

  test('register page validates password length', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('Username').fill('testuser');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel(/^password$/i).fill('short');
    await page.getByLabel(/confirm password/i).fill('short');
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page.getByRole('alert')).toContainText(/8 characters/);
  });

  test('register page validates password match', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('Username').fill('testuser');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel(/^password$/i).fill('password123');
    await page.getByLabel(/confirm password/i).fill('different123');
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page.getByRole('alert')).toContainText(/do not match/i);
  });

  test('login page has link to register', async ({ page }) => {
    await page.goto('/login');
    const signUpLink = page.getByRole('link', { name: /sign up/i });
    await expect(signUpLink).toBeVisible();
    await signUpLink.click();
    await expect(page).toHaveURL(/\/register/);
  });

  test('register page has link to login', async ({ page }) => {
    await page.goto('/register');
    const signInLink = page.getByRole('link', { name: /sign in/i });
    await expect(signInLink).toBeVisible();
    await signInLink.click();
    await expect(page).toHaveURL(/\/login/);
  });
});
