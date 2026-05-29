import { test, expect } from '@playwright/test';

test.describe('NextVWT Karaoke Module E2E', () => {
  test('should open floating YouTube karaoke player without downloading local media', async ({ page }) => {
    await page.goto('/');

    // Handle Auth Screen (Login)
    const usernameAuth = page.locator('input[placeholder="Masukkan username"]');
    await expect(usernameAuth).toBeVisible({ timeout: 15000 });
    await usernameAuth.fill('KaraokeHost');
    await page.locator('input[placeholder="Masukkan kata sandi"]').fill('password123');
    await page.locator('button:has-text("Masuk ke Sistem")').click();

    // After login, radio interface appears in OFF state. Flip the power switch to ON.
    await page.locator('.power-container').click();

    await page.waitForTimeout(4500);

    await page.locator('#settings-btn').click();
    await expect(page.getByTestId('set-karaoke-settings-panel')).toBeVisible();
    await page.getByTestId('settings-open-karaoke-button').click();

    await expect(page.getByTestId('karaoke-floating-player')).toBeVisible();
    await page.getByTestId('karaoke-url-input').fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

    const iframe = page.getByTestId('karaoke-youtube-iframe');
    await expect(iframe).toBeVisible();
    await expect(iframe).toHaveAttribute('src', /youtube\.com\/embed\/dQw4w9WgXcQ/);

    await page.getByTestId('karaoke-close-button').click();
    await expect(page.getByTestId('karaoke-floating-player')).toHaveCount(0);
  });
});
