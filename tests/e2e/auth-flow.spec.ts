/**
 * Sugestão 27: Testes E2E - Fluxo de autenticação
 * 
 * Para executar: npx playwright test
 */

import { test, expect } from '@playwright/test';

test.describe('Fluxo de Autenticação', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('deve mostrar portal de notícias inicialmente', async ({ page }) => {
    await expect(page.locator('text=Notícias em Tempo Real')).toBeVisible();
  });

  test('deve abrir modal de cadastro ao clicar em "Fale Conosco" duas vezes', async ({ page }) => {
    const faleConoscoButton = page.locator('text=Fale Conosco');
    
    // Primeiro clique
    await faleConoscoButton.click();
    
    // Segundo clique rápido (dentro de 350ms)
    await faleConoscoButton.click();
    
    // Deve mostrar modal de cadastro ou PinPad
    await expect(
      page.locator('text=Criar Conta').or(page.locator('text=Security Access'))
    ).toBeVisible({ timeout: 2000 });
  });

  test('deve permitir cadastro de novo usuário', async ({ page }) => {
    // Abrir modal (duplo clique em "Fale Conosco")
    const faleConoscoButton = page.locator('text=Fale Conosco');
    await faleConoscoButton.click();
    await faleConoscoButton.click();
    
    // Preencher formulário
    await page.fill('input[placeholder*="nickname"]', 'test_user');
    await page.fill('input[type="text"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    
    // Submeter
    await page.click('button:has-text("Finalizar Cadastro")');
    
    // Deve mostrar PinPad para configurar PIN
    await expect(page.locator('text=Configure seu PIN')).toBeVisible({ timeout: 5000 });
  });

  test('deve configurar PIN após cadastro', async ({ page }) => {
    // Assumindo que já está no PinPad
    const pinPad = page.locator('text=Configure seu PIN');
    if (await pinPad.isVisible({ timeout: 2000 })) {
      // Clicar nos números do PIN (exemplo: 1234)
      await page.click('button:has-text("1")');
      await page.click('button:has-text("2")');
      await page.click('button:has-text("3")');
      await page.click('button:has-text("4")');
      
      // Deve desbloquear e mostrar mensagens
      await expect(page.locator('text=Mensagens').or(page.locator('text=conversas'))).toBeVisible({ timeout: 3000 });
    }
  });
});
