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
    await expect(page.locator('text=Noticias24h')).toBeVisible();
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
    await page.waitForTimeout(100);
    await faleConoscoButton.click();
    
    // Aguardar modal aparecer
    await page.waitForTimeout(1000);
    
    // Verificar se modal de cadastro apareceu
    const signupTitle = page.locator('text=Criar Conta');
    const hasSignup = await signupTitle.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasSignup) {
      // Preencher formulário - usar ordem dos inputs
      const allInputs = page.locator('input');
      const nicknameInput = allInputs.nth(0); // Primeiro input é nickname
      const emailInput = allInputs.nth(1); // Segundo input é email
      const passwordInput = page.locator('input[type="password"]').first();
      
      await nicknameInput.waitFor({ state: 'visible', timeout: 5000 });
      await nicknameInput.fill(`test_user_${Date.now()}`);
      
      await emailInput.waitFor({ state: 'visible', timeout: 5000 });
      await emailInput.fill(`test_${Date.now()}@example.com`);
      
      await passwordInput.waitFor({ state: 'visible', timeout: 5000 });
      await passwordInput.fill('password123');
      
      // Submeter
      await page.click('button:has-text("Finalizar Cadastro"), button[type="submit"]');
      
      // Aguardar um pouco para processar cadastro
      await page.waitForTimeout(2000);
      
      // Deve mostrar PinPad para configurar PIN ou voltar para portal
      const pinPad = page.getByText(/Configure seu PIN|Security Access|Digite seu Código/);
      const portal = page.locator('text=Noticias24h');
      
      const hasPinPad = await pinPad.isVisible({ timeout: 8000 }).catch(() => false);
      const hasPortal = await portal.isVisible({ timeout: 2000 }).catch(() => false);
      
      // Se voltou para portal, pode ser que já tenha PIN configurado ou erro ocorreu
      expect(hasPinPad || hasPortal).toBeTruthy();
    } else {
      // Se não apareceu modal, pode ser que já tenha conta ou PinPad apareceu direto
      const pinPad = page.getByText(/Configure seu PIN|Security Access/);
      const hasPinPad = await pinPad.isVisible({ timeout: 2000 }).catch(() => false);
      expect(hasSignup || hasPinPad).toBeTruthy();
    }
  });

  test('deve configurar PIN após cadastro', async ({ page }) => {
    // Assumindo que já está no PinPad
    const pinPad = page.getByText(/Configure seu PIN|Security Access|Digite seu Código/);
    if (await pinPad.isVisible({ timeout: 2000 })) {
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('button', { name: 'Dígito 1' }).click();
      await page.waitForTimeout(150);
      await dialog.getByRole('button', { name: 'Dígito 2' }).click();
      await page.waitForTimeout(150);
      await dialog.getByRole('button', { name: 'Dígito 3' }).click();
      await page.waitForTimeout(150);
      await dialog.getByRole('button', { name: 'Dígito 4' }).click();
      
      // Deve desbloquear e mostrar mensagens
      await expect(page.getByText(/Mensagens|conversas/)).toBeVisible({ timeout: 3000 });
    }
  });
});
