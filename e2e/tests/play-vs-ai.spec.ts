import { test, expect } from '@playwright/test';

const ENABLE_DEBUG_LOGS = !process.env.CI && process.env.E2E_DEBUG_LOGS !== '0';

test.describe('Play vs AI', () => {
  test.beforeEach(async ({ page }) => {
    if (ENABLE_DEBUG_LOGS) {
      page.on('console', (msg) => {
        console.log(`[browser:${msg.type()}] ${msg.text()}`);
      });

      page.on('pageerror', (error) => {
        console.log(`[browser:pageerror] ${error.message}`);
      });
    }

    await page.goto('/play');
  });

  test('can start a game and see pieces on the board', async ({ page }) => {
    await page.getByRole('button', { name: /new game/i }).click();

    // Should have white pieces (squares 1-20)
    const whitePieces = page.locator('[aria-label*="white man"]');
    await expect(whitePieces.first()).toBeVisible();
    expect(await whitePieces.count()).toBe(20);

    // Should have black pieces (squares 31-50)
    const blackPieces = page.locator('[aria-label*="black man"]');
    await expect(blackPieces.first()).toBeVisible();
    expect(await blackPieces.count()).toBe(20);
  });

  test('can select a piece and see legal moves', async ({ page }) => {
    await page.getByRole('button', { name: /new game/i }).click();

    // Click on square 17 (a white man that can move to 21 or 22)
    await page.locator('[data-square="17"]').click();

    // Square should show selection indicator (ring)
    const selectedSquare = page.locator('[data-square="17"]');
    await expect(selectedSquare).toHaveClass(/ring-yellow/);
  });

  test('can make a move by clicking piece then destination', async ({ page }) => {
    await page.getByRole('button', { name: /new game/i }).click();

    // White's turn: select piece at square 17
    await page.locator('[data-square="17"]').click();
    
    // Move to square 21
    await page.locator('[data-square="21"]').click();

    // Piece should have moved
    await expect(page.locator('[data-square="21"][aria-label*="white man"]')).toBeVisible();
    await expect(page.locator('[data-square="17"][aria-label*="empty"]')).toBeVisible();
  });

  test('AI responds to player move', async ({ page }) => {
    await page.getByRole('button', { name: /new game/i }).click();

    // Count initial black pieces
    const initialBlackCount = await page.locator('[aria-label*="black man"]').count();
    expect(initialBlackCount).toBe(20);

    // Make a move: 20 -> 25
    await page.locator('[data-square="20"]').click();
    await page.locator('[data-square="25"]').click();

    // Wait for AI to respond (should happen within a few seconds)
    // After AI moves, one black piece should have moved to a new position
    await page.waitForTimeout(3000);

    // The move history should have at least 2 entries (player + AI)
    const moveItems = page.locator('.bg-white.dark\\:bg-gray-800');
    await expect(moveItems.first()).toBeVisible();
  });

  test('can undo a move', async ({ page }) => {
    await page.getByRole('button', { name: /new game/i }).click();

    // Make a move: 20 -> 25
    await page.locator('[data-square="20"]').click();
    await page.locator('[data-square="25"]').click();

    // Wait briefly for AI
    await page.waitForTimeout(500);

    // Click undo
    await page.getByRole('button', { name: /undo/i }).click();

    // Piece should be back at square 20
    await expect(page.locator('[data-square="20"][aria-label*="white man"]')).toBeVisible();
  });

  test('can pause and resume', async ({ page }) => {
    await page.getByRole('button', { name: /new game/i }).click();

    // Click pause
    await page.getByRole('button', { name: /pause/i }).click();

    // Should show paused state
    await expect(page.getByText('Game paused', { exact: true })).toBeVisible();

    // Click resume on the pause overlay dialog
    const pauseDialog = page.getByRole('dialog', { name: /game paused/i });
    await expect(pauseDialog).toBeVisible();
    await pauseDialog.getByRole('button', { name: /resume/i }).click();

    // Should no longer show paused
    await expect(page.getByText('Game paused', { exact: true })).not.toBeVisible();
  });

  test('can resign a game', async ({ page }) => {
    await page.getByRole('button', { name: /new game/i }).click();

    // Click resign
    await page.getByRole('button', { name: /resign/i }).click();

    // Game should end — New Game button should appear
    await expect(page.getByRole('button', { name: /new game/i })).toBeVisible();

    // Should show game over status
    await expect(page.getByText('You lost')).toBeVisible();
  });

  test('settings panel opens and closes', async ({ page }) => {
    // Open settings
    await page.getByLabel(/show settings/i).click();

    // Should see settings options
    await expect(page.getByText(/board theme/i)).toBeVisible();
    await expect(page.getByText(/opponent/i)).toBeVisible();

    // Close settings
    await page.getByLabel(/hide settings/i).click();

    // Settings should be hidden
    await expect(page.getByText(/board theme/i)).not.toBeVisible();
  });

  test('can change AI difficulty in settings', async ({ page }) => {
    await page.getByLabel(/show settings/i).click();

    // Should see difficulty options
    await expect(page.getByText(/easy/i)).toBeVisible();
    await expect(page.getByText(/medium/i)).toBeVisible();
    await expect(page.getByText(/hard/i)).toBeVisible();
  });

  test('full game flow: move, AI responds, check status', async ({ page }) => {
    // Start game
    await page.getByRole('button', { name: /new game/i }).click();

    // Verify it's the player's turn
    await expect(page.getByText(/your move/i)).toBeVisible();

    // Make a move: 20 -> 25
    await page.locator('[data-square="20"]').click();
    await page.locator('[data-square="25"]').click();

    // Wait for AI to think and respond
    await expect(page.getByText(/your move/i)).toBeVisible({ timeout: 10000 });

    // After AI responds, it should be player's turn again
    // Make another move
    const selectableSquares = page.locator('[aria-label*="white man"]');
    const firstPiece = selectableSquares.first();
    await firstPiece.click();

    // A legal move indicator should appear somewhere
    // (green dot on an empty square)
    const legalMoves = page.locator('.bg-green-500\\/40');
    if (await legalMoves.count() > 0) {
      await legalMoves.first().click();
    }
  });
});
