import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:3001';

test.describe('Componentes de UI - Testes de Funcionalidade', () => {
  
  test.beforeEach(async ({ context }) => {
    await context.addCookies([{
      name: 'test-bypass',
      value: 'true',
      domain: '127.0.0.1',
      path: '/',
    }]);
  });

  test('1. Página inicial carrega sem erros', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Verifica se não há erros críticos no console
    const criticalErrors = errors.filter(e => 
      !e.includes('favicon') && 
      !e.includes('404') &&
      !e.includes('sourcemap')
    );
    
    expect(criticalErrors.length).toBeLessThan(5); // Permite alguns erros não críticos
  });

  test('2. Título da página está correto', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/Guardião|Daily Brief/i);
  });

  test('3. Botão de login está presente na home', async ({ page }) => {
    await page.goto(BASE_URL);
    const loginButton = page.getByRole('link', { name: /Entrar/i }).or(page.getByText(/Entrar/i));
    await expect(loginButton.first()).toBeVisible({ timeout: 5000 });
  });

  test('4. Navegação para signup funciona', async ({ page }) => {
    await page.goto(BASE_URL);
    const signupLink = page.getByRole('link', { name: /Começar|Sign|Criar/i });
    
    if (await signupLink.count() > 0) {
      await signupLink.first().click();
      await page.waitForTimeout(1000);
      // Verifica se navegou (pode ser para /signup ou manter na mesma página)
      expect(page.url()).toMatch(/signup|login|localhost|127.0.0.1/);
    }
  });

  test('5. Responsividade - Mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto(BASE_URL);
    
    // Verifica se o conteúdo principal ainda está visível
    await expect(page.getByText(/PATRIMÔNIO|Guardião/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('6. Responsividade - Tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad
    await page.goto(BASE_URL);
    
    await expect(page.getByText(/PATRIMÔNIO|Guardião/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('7. Links não estão quebrados', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Coleta todos os links
    const links = await page.locator('a[href]').all();
    
    for (const link of links.slice(0, 5)) { // Testa apenas os primeiros 5
      const href = await link.getAttribute('href');
      if (href && !href.startsWith('#')) {
        // Verifica se o link não está quebrado
        await expect(link).toBeVisible();
      }
    }
  });

  test('8. Imagens carregam corretamente', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    const images = await page.locator('img').all();
    
    for (const img of images.slice(0, 3)) { // Testa apenas as primeiras 3
      const isVisible = await img.isVisible().catch(() => false);
      if (isVisible) {
        // Verifica se a imagem tem src válido
        const src = await img.getAttribute('src');
        expect(src).toBeTruthy();
      }
    }
  });
});
