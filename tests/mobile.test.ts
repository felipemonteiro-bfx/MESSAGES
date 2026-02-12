import { test, expect, devices } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:3001';

// Device configuration at top-level
test.use({ ...devices['iPhone 14'] });

test.describe('Mobile Platinum Audit', () => {
  test('1. Mobile Accessibility', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.getByText(/SEU PATRIMÔNIO/i)).toBeVisible();
  });

  test('2. Marketplace Responsiveness', async ({ page }) => {
    await page.goto(`${BASE_URL}/marketplace`);
    await expect(page.getByText(/Marketplace Guardião/i)).toBeVisible();
  });
});
