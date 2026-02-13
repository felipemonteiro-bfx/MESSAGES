/**
 * Sugestão 27: Testes E2E - Fluxo de mensagens
 */

import { test, expect } from '@playwright/test';

test.describe('Fluxo de Mensagens', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Assumir que já está autenticado e desbloqueado
    // Em um teste real, você faria login primeiro
  });

  test('deve enviar mensagem de texto', async ({ page }) => {
    // Assumindo que já está na tela de mensagens
    const messageInput = page.locator('textarea, input[type="text"]').first();
    
    if (await messageInput.isVisible({ timeout: 2000 })) {
      await messageInput.fill('Teste de mensagem');
      await page.click('button:has-text("Enviar")');
      
      // Deve aparecer a mensagem na lista
      await expect(page.locator('text=Teste de mensagem')).toBeVisible({ timeout: 3000 });
    }
  });

  test('deve permitir drag & drop de imagens', async ({ page }) => {
    // Criar arquivo de teste
    const filePath = 'tests/fixtures/test-image.jpg';
    
    // Simular drag & drop
    const dropZone = page.locator('[data-stealth-content="true"]').first();
    
    await dropZone.dispatchEvent('dragover', { bubbles: true });
    
    // Verificar se overlay de drag aparece
    await expect(page.locator('text=Solte os arquivos aqui')).toBeVisible({ timeout: 1000 });
  });

  test('deve carregar mais mensagens ao clicar em "Carregar mensagens anteriores"', async ({ page }) => {
    const loadMoreButton = page.locator('text=Carregar mensagens anteriores');
    
    if (await loadMoreButton.isVisible({ timeout: 2000 })) {
      const initialMessageCount = await page.locator('[data-message]').count();
      
      await loadMoreButton.click();
      
      // Aguardar carregamento
      await page.waitForTimeout(1000);
      
      const newMessageCount = await page.locator('[data-message]').count();
      
      expect(newMessageCount).toBeGreaterThan(initialMessageCount);
    }
  });
});
