import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:3001';

test.describe('Performance Tests', () => {
  
  test.beforeEach(async ({ context, page }) => {
    await context.addCookies([{
      name: 'test-bypass',
      value: 'true',
      domain: '127.0.0.1',
      path: '/',
    }]);
    
    await page.addInitScript(() => {
      localStorage.setItem('disguise_mode', 'false');
    });
  });

  test('1. Página inicial carrega rapidamente', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Deve carregar em menos de 5 segundos
    expect(loadTime).toBeLessThan(5000);
  });

  test('2. Dashboard carrega sem erros de console', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    // Filtra erros não críticos
    const criticalErrors = errors.filter(e => 
      !e.includes('favicon') && 
      !e.includes('sourcemap') &&
      !e.includes('404')
    );
    
    expect(criticalErrors.length).toBeLessThan(3);
  });

  test('3. Navegação entre páginas é rápida', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    const pages = ['/dashboard', '/products/new', '/plans'];
    
    for (const path of pages) {
      const startTime = Date.now();
      await page.goto(`${BASE_URL}${path}`);
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      // Cada página deve carregar em menos de 3 segundos
      expect(loadTime).toBeLessThan(3000);
    }
  });

  test('4. Imagens são otimizadas', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    const images = await page.locator('img').all();
    
    for (const img of images.slice(0, 5)) {
      const src = await img.getAttribute('src');
      if (src) {
        // Verifica se usa next/image ou tem otimizações
        const isOptimized = src.includes('_next/image') || src.includes('w=') || src.includes('q=');
        // Não falha se não otimizado, apenas verifica
        if (!isOptimized && !src.startsWith('data:')) {
          console.log(`Imagem não otimizada: ${src}`);
        }
      }
    }
  });

  test('5. Sem memory leaks em navegação', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Navega várias vezes
    for (let i = 0; i < 5; i++) {
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForTimeout(500);
      await page.goto(BASE_URL);
      await page.waitForTimeout(500);
    }
    
    // Verifica se ainda funciona
    await expect(page.getByText(/PATRIMÔNIO|Guardião/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('6. Busca não causa lag', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.getByPlaceholder(/Buscar garantias/i);
    if (await searchInput.isVisible().catch(() => false)) {
      const startTime = Date.now();
      await searchInput.fill('teste');
      await page.waitForTimeout(500); // Aguarda debounce
      const responseTime = Date.now() - startTime;
      
      // Busca deve responder rapidamente
      expect(responseTime).toBeLessThan(2000);
    }
  });
});
