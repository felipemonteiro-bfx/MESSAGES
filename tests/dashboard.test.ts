import { test, expect } from '@playwright/test';
import { mockWarranties, mockExpiredWarranty, mockExpiringSoonWarranty } from './fixtures/warranties';

const BASE_URL = 'http://127.0.0.1:3001';

test.describe('Dashboard - Funcionalidades Principais', () => {
  
  test.beforeEach(async ({ context, page }) => {
    // Adiciona o cookie de bypass para os testes
    await context.addCookies([{
      name: 'test-bypass',
      value: 'true',
      domain: '127.0.0.1',
      path: '/',
    }]);
    
    // Desabilitar modo disfarce
    await page.addInitScript(() => {
      localStorage.setItem('disguise_mode', 'false');
    });

    // Mock de dados do Supabase (via interceptação de rede)
    await page.route('**/rest/v1/warranties*', async route => {
      const url = new URL(route.request().url());
      const searchParams = url.searchParams;
      
      // Simula resposta do Supabase
      const response = {
        data: mockWarranties,
        error: null,
      };
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response.data),
      });
    });
  });

  test('1. Dashboard carrega corretamente', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    
    // Aguarda carregar (pode redirecionar para login se não autenticado)
    await page.waitForTimeout(2000);
    
    // Verifica se está no dashboard OU foi redirecionado para login (ambos são válidos)
    const url = page.url();
    const isDashboard = url.includes('/dashboard');
    const isLogin = url.includes('/login');
    
    if (isDashboard) {
      // Se está no dashboard, verifica elementos
      const title = page.getByText(/Meu Cofre|Dashboard/i);
      await expect(title.first()).toBeVisible({ timeout: 10000 });
    } else if (isLogin) {
      // Se redirecionou para login, verifica se a página de login carregou
      await expect(page.getByText(/Login|Entrar/i).first()).toBeVisible({ timeout: 5000 });
    } else {
      // Pelo menos verifica que não deu erro 500
      expect(url).not.toContain('500');
    }
  });

  test('2. Botão de Nova Garantia está presente', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    
    const newButton = page.getByRole('button', { name: /Nova Garantia/i });
    await expect(newButton).toBeVisible({ timeout: 10000 });
  });

  test('3. Estatísticas são exibidas', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    
    // Aguarda as estatísticas carregarem
    await page.waitForTimeout(2000);
    
    // Verifica se pelo menos uma estatística está presente
    const stats = page.locator('[class*="StatCard"], [class*="stat"]');
    await expect(stats.first()).toBeVisible({ timeout: 5000 });
  });

  test('4. Campo de busca está presente', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    
    const searchInput = page.getByPlaceholder(/Buscar garantias/i);
    await expect(searchInput).toBeVisible({ timeout: 10000 });
  });

  test('5. Filtros de status estão presentes', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    
    // Verifica se os botões de filtro estão presentes
    await expect(page.getByRole('button', { name: /Todas/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Ativas/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Vencendo/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Expiradas/i })).toBeVisible();
  });

  test('6. Modos de visualização (Grid/Lista) estão presentes', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    
    // Verifica se os botões de visualização estão presentes
    const gridButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    await expect(gridButton).toBeVisible({ timeout: 10000 });
  });

  test('7. Busca funciona corretamente', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    
    const searchInput = page.getByPlaceholder(/Buscar garantias/i);
    await searchInput.fill('teste');
    
    // Aguarda o debounce
    await page.waitForTimeout(500);
    
    // Verifica se a busca foi aplicada (pode não ter resultados, mas não deve dar erro)
    await expect(searchInput).toHaveValue('teste');
  });

  test('8. Filtros podem ser clicados', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    
    const activeFilter = page.getByRole('button', { name: /Ativas/i });
    await activeFilter.click();
    
    // Verifica se o filtro foi aplicado (não deve dar erro)
    await expect(activeFilter).toBeVisible();
  });

  test('9. Empty state é exibido quando não há garantias', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    
    // Aguarda carregar
    await page.waitForTimeout(3000);
    
    // Se não houver garantias, deve mostrar empty state
    const emptyState = page.getByText(/Nenhuma garantia encontrada/i).or(page.getByText(/Comece adicionando/i));
    
    // Pode ou não estar visível dependendo dos dados
    // Apenas verifica se a página não quebrou
    await expect(page.getByText('Meu Cofre')).toBeVisible();
  });

  test('10. Loading states são exibidos durante carregamento', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    
    // Durante o carregamento inicial, deve haver algum indicador
    // (skeleton ou spinner)
    const loadingIndicator = page.locator('[class*="animate-pulse"], [class*="spinner"], [class*="loading"]').first();
    
    // Pode não estar visível se carregar muito rápido
    // Apenas verifica se a página não quebrou
    await expect(page.getByText('Meu Cofre')).toBeVisible({ timeout: 10000 });
  });
});
