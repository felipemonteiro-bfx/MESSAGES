import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:3001';

test.describe('Guardião de Notas v14.8 Platinum - Master Audit', () => {
  
  test('1. Landing Page Authority', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/Guardião/);
    await expect(page.getByText('SEU PATRIMÔNIO', { exact: false })).toBeVisible();
  });

  test('2. Authentication Flow (UI Check)', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page.getByRole('heading', { name: /Bem-vindo/i })).toBeVisible();
  });

  test('3. Dashboard & Concierge', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    const title = await page.title();
    expect(title).toContain('Guardião');
  });

  test('4. Marketplace Navigation', async ({ page }) => {
    await page.goto(`${BASE_URL}/marketplace`);
    // Usando Regex e ignorando case para ser mais resiliente
    await expect(page.getByText(/Bens seminovos com procedência/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /Filtros/i })).toBeVisible();
  });

  test('5. Panic Mode (Disguise) Activation', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    
    await page.evaluate(() => {
      localStorage.setItem('panic_mode', 'true');
      window.location.reload();
    });

    await page.waitForTimeout(2000);
    await expect(page.getByText(/Bloco de Notas/i)).toBeVisible();
    
    await page.evaluate(() => {
      localStorage.setItem('panic_mode', 'false');
    });
  });

  test('6. International Travel Mode', async ({ page }) => {
    await page.goto(`${BASE_URL}/travel-check`);
    await expect(page.getByText(/Modo Viagem/i)).toBeVisible();
  });

});
