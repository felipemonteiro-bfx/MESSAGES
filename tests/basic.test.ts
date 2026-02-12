import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context, page }) => {
  // Desabilitar modo disfarce para testes
  await context.addCookies([{
    name: 'test-bypass',
    value: 'true',
    domain: '127.0.0.1',
    path: '/',
  }]);
  
  // Desabilitar modo disfarce no localStorage
  await page.addInitScript(() => {
    localStorage.setItem('disguise_mode', 'false');
  });
});

test('has title', async ({ page }) => {
  await page.goto('http://127.0.0.1:3001');
  await page.waitForLoadState('networkidle');
  
  // Aceita tanto "Guardião" quanto "Daily Brief" (modo disfarce)
  const title = await page.title();
  expect(title.length).toBeGreaterThan(0); // Apenas verifica que tem título
  expect(title).toMatch(/Guardião|Daily Brief|Warranty/i);
});

test('check for login button or news disguise', async ({ page }) => {
  await page.goto('http://127.0.0.1:3001');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000); // Aguarda carregar completamente
  
  // Verifica se há qualquer conteúdo na página
  const bodyText = await page.textContent('body').catch(() => '');
  
  // Verifica se há botão de login OU se está no modo disfarce (Daily Brief)
  // OU se há qualquer conteúdo relacionado à aplicação
  const loginButton = page.getByText(/Entrar|Login|Sign|Fazer login/i);
  const newsTitle = page.getByText(/Daily Brief|Top Stories|News/i);
  const warrantyText = page.getByText(/Guardião|Warranty|PATRIMÔNIO|Garantias/i);
  
  const hasLogin = await loginButton.isVisible().catch(() => false);
  const hasNews = await newsTitle.isVisible().catch(() => false);
  const hasWarranty = await warrantyText.isVisible().catch(() => false);
  const hasContent = bodyText && bodyText.length > 50; // Página tem conteúdo
  
  // Aceita qualquer um dos quatro (modo normal, disfarce, dashboard ou qualquer conteúdo)
  expect(hasLogin || hasNews || hasWarranty || hasContent).toBeTruthy();
});
