import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('http://127.0.0.1:3001');
  await expect(page).toHaveTitle(/Guardião/);
});

test('check for login button', async ({ page }) => {
  await page.goto('http://127.0.0.1:3001');
  const loginButton = page.locator('text=Entrar');
  await expect(loginButton).toBeVisible();
});
