import { test, expect } from '@playwright/test';

test.describe('Gameplay', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/play');
  });

  test('play page has game board', async ({ page }) => {
    await expect(page.getByRole('grid')).toBeVisible();
  });

  test('play page has game controls', async ({ page }) => {
    await expect(page.getByRole('button', { name: /new game/i })).toBeVisible();
  });

  test('can start a new game', async ({ page }) => {
    await page.getByRole('button', { name: /new game/i }).click();
    // Board should show pieces
    const pieces = page.locator('[aria-label*="man"], [aria-label*="king"]');
    await expect(pieces.first()).toBeVisible();
  });

  test('board renders 100 squares', async ({ page }) => {
    const squares = page.getByRole('gridcell');
    await expect(squares).toHaveCount(100);
  });

  test('can click on a piece square', async ({ page }) => {
    await page.getByRole('button', { name: /new game/i }).click();
    // Click a white piece square
    const whitePiece = page.locator('[aria-label*="white man"]').first();
    await whitePiece.click();
    // Should show selection (indicated by CSS change - we just verify no crash)
    await expect(whitePiece).toBeVisible();
  });

  test('undo button exists', async ({ page }) => {
    await expect(page.getByRole('button', { name: /undo/i })).toBeVisible();
  });

  test('resign button exists', async ({ page }) => {
    await expect(page.getByRole('button', { name: /resign/i })).toBeVisible();
  });

  test('draw button exists', async ({ page }) => {
    await expect(page.getByRole('button', { name: /draw/i })).toBeVisible();
  });
});
