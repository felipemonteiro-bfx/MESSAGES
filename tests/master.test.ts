import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:3001';

test.describe('Guardião de Notas v15.0 Platinum - Master Audit', () => {
  
  test.beforeEach(async ({ context }) => {
    // Adiciona o cookie de bypass para os testes
    await context.addCookies([{
      name: 'test-bypass',
      value: 'true',
      domain: '127.0.0.1',
      path: '/',
    }]);
  });

  test('1. Landing Page Authority', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/Guardião/);
    await expect(page.getByText('SEU PATRIMÔNIO', { exact: false })).toBeVisible();
  });

  test('2. Dashboard & Health Check', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page.getByText(/Asset Health/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Balanço Consolidado/i)).toBeVisible();
  });

  test('3. Marketplace Integrity', async ({ page }) => {
    await page.goto(`${BASE_URL}/marketplace`);
    await expect(page.getByRole('heading', { name: /Marketplace Guardião/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Bens seminovos com procedência/i).first()).toBeVisible();
  });

  test('4. Analytics Intelligence', async ({ page }) => {
    await page.goto(`${BASE_URL}/analytics`);
    await expect(page.getByText(/Impact Analytics/i).or(page.getByText(/Currency Intelligence/i))).toBeVisible({ timeout: 15000 });
  });

  test('5. Panic Mode (Functional Camouflage)', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    
    await page.evaluate(() => {
      localStorage.setItem('panic_mode', 'true');
      window.location.reload();
    });

    await page.waitForTimeout(2000);
    await expect(page.getByText(/Bloco de Notas Pessoal/i)).toBeVisible();
    
    await page.evaluate(() => {
      localStorage.setItem('panic_mode', 'false');
    });
  });

  test('6. International Travel Mode', async ({ page }) => {
    await page.goto(`${BASE_URL}/travel-check`);
    await expect(page.getByText(/Modo Viagem/i)).toBeVisible();
  });

});
