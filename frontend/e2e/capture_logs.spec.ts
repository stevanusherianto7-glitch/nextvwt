import { test, expect } from '@playwright/test';
test('capture logs', async ({ page }) => {
  page.on('console', msg => console.log('CONSOLE:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(10000);
});