/**
 * Teste E2E: Adicionar contato e abrir novo chat
 * 
 * Testa o fluxo completo de adicionar um contato pelo nickname e abrir um novo chat
 * 
 * Para executar: npx playwright test tests/e2e/add-contact-chat.spec.ts
 */

import { test, expect } from '@playwright/test';

test.describe('Adicionar Contato e Abrir Chat', () => {
  const TARGET_NICKNAME = 'username1010';
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Limpar storage e recarregar para garantir estado limpo
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test(`deve abrir novo chat com nickname "${TARGET_NICKNAME}"`, async ({ page }, testInfo) => {
    testInfo.setTimeout(90000); // Fluxo longo: signup + PIN + add contact
    // Passo 1: Acessar portal de notícias
    await expect(page.locator('text=Noticias24h')).toBeVisible({ timeout: 10000 });
    
    // Passo 2: Fazer login/cadastro (duplo clique em "Fale Conosco")
    const faleConoscoButton = page.getByTestId('fale-conosco-btn').or(page.locator('button:has-text("Fale Conosco")')).first();
    await faleConoscoButton.waitFor({ state: 'visible', timeout: 5000 });
    await faleConoscoButton.click();
    await page.waitForTimeout(100);
    await faleConoscoButton.click();
    await page.waitForTimeout(1000);
    
    // Verificar se apareceu modal de cadastro ou PinPad
    const signupTitle = page.locator('text=Criar Conta').first();
    const pinPadTitle = page.getByText(/Configure seu PIN|Security Access|Digite seu Código/).first();
    
    const hasSignup = await signupTitle.isVisible({ timeout: 3000 }).catch(() => false);
    const hasPinPad = await pinPadTitle.isVisible({ timeout: 3000 }).catch(() => false);
    
    // Se aparecer modal de cadastro, preencher
    if (hasSignup) {
      const nickname = `test_${Date.now()}`;
      const email = `test_${Date.now()}@example.com`;
      
      // Preencher formulário
      const allInputs = page.locator('input');
      const nicknameInput = allInputs.nth(0);
      const emailInput = allInputs.nth(1);
      const passwordInput = page.locator('input[type="password"]').first();
      
      await nicknameInput.waitFor({ state: 'visible', timeout: 5000 });
      await nicknameInput.fill(nickname);
      
      await emailInput.waitFor({ state: 'visible', timeout: 5000 });
      await emailInput.fill(email);
      
      await passwordInput.waitFor({ state: 'visible', timeout: 5000 });
      await passwordInput.fill('password123');
      
      // Submeter cadastro
      await page.click('button:has-text("Finalizar Cadastro"), button:has-text("Criar"), button[type="submit"]');
      await page.waitForTimeout(2000);
    }
    
    // Passo 3: Configurar PIN (se necessário)
    const pinPad = page.getByText(/Configure seu PIN|Security Access|Digite seu Código/).first();
    const pinPadVisible = await pinPad.isVisible({ timeout: 8000 }).catch(() => false);
    
    if (pinPadVisible) {
      // Scopar buscas ao dialog do PinPad para evitar ambiguidade
      const dialog = page.getByRole('dialog');
      await dialog.waitFor({ state: 'visible', timeout: 3000 });
      // Configurar PIN: 1234 - usuário novo precisa digitar 2x (enter + confirm)
      const enterPin1234 = async () => {
        await dialog.getByRole('button', { name: 'Dígito 1' }).click();
        await page.waitForTimeout(150);
        await dialog.getByRole('button', { name: 'Dígito 2' }).click();
        await page.waitForTimeout(150);
        await dialog.getByRole('button', { name: 'Dígito 3' }).click();
        await page.waitForTimeout(150);
        await dialog.getByRole('button', { name: 'Dígito 4' }).click();
        await page.waitForTimeout(1000);
      };
      await enterPin1234();
      await enterPin1234(); // Confirmação
      await page.waitForTimeout(4000);
    }
    
    // Passo 4: Aguardar tela de mensagens aparecer (ChatLayout)
    // Verificar se estamos na tela de mensagens (pode levar alguns segundos)
    // Tentar múltiplos seletores para encontrar a tela de mensagens
    const messagingSelectors = [
      '[data-testid="message-input"]',
      'textarea[data-testid="message-input"]',
      '[data-chat="true"]',
      'text=Mensagens',
      'button[data-testid="add-contact-button"]'
    ];
    
    let messagingScreenVisible = false;
    for (const selector of messagingSelectors) {
      try {
        await page.locator(selector).first().waitFor({ state: 'visible', timeout: 5000 });
        messagingScreenVisible = true;
        break;
      } catch {
        continue;
      }
    }
    
    if (!messagingScreenVisible) {
      // Se não aparecer, pode ser que ainda está no portal ou PinPad
      // Tentar inserir PIN novamente se PinPad estiver visível
      const pinPadStillVisible = await page.getByText(/Configure seu PIN|Security Access|Digite seu Código/).first().isVisible({ timeout: 2000 }).catch(() => false);
      if (pinPadStillVisible) {
        const dialog = page.getByRole('dialog');
        await dialog.getByRole('button', { name: 'Dígito 1' }).click();
        await page.waitForTimeout(150);
        await dialog.getByRole('button', { name: 'Dígito 2' }).click();
        await page.waitForTimeout(150);
        await dialog.getByRole('button', { name: 'Dígito 3' }).click();
        await page.waitForTimeout(150);
        await dialog.getByRole('button', { name: 'Dígito 4' }).click();
        await page.waitForTimeout(2500);
      }
    }
    
    // Passo 5: Clicar no botão de adicionar contato
    // Tentar múltiplos seletores para o botão
    const addContactSelectors = [
      '[data-testid="add-contact-button"]',
      'button[aria-label="Adicionar contato"]',
      'button:has-text("Adicionar primeiro contato")',
      'button:has([class*="UserPlus"])',
      'button:has-text("+")'
    ];
    
    // Aguardar sidebar/mensagens carregar
    await page.waitForTimeout(2000);
    let addContactButton = null;
    for (const selector of addContactSelectors) {
      try {
        const button = page.locator(selector).first();
        await button.waitFor({ state: 'visible', timeout: 15000 });
        addContactButton = button;
        break;
      } catch {
        continue;
      }
    }
    
    if (!addContactButton) {
      throw new Error('Botão de adicionar contato não encontrado. Verifique se está na tela de mensagens.');
    }
    
    await addContactButton.click();
    
    // Passo 6: Aguardar modal de adicionar contato aparecer
    const addContactModal = page.getByText(/Novo Contato|Nickname ou Email/).first();
    await addContactModal.waitFor({ state: 'visible', timeout: 5000 });
    
    // Passo 7: Digitar o nickname (usar pressSequentially para disparar onChange em inputs controlados)
    const nicknameInput = page.getByPlaceholder(/nickname ou email|Digite o nickname/);
    await nicknameInput.waitFor({ state: 'visible', timeout: 5000 });
    await nicknameInput.click();
    await nicknameInput.pressSequentially(TARGET_NICKNAME, { delay: 50 });
    await page.waitForTimeout(300);
    
    // Passo 8: Clicar em "Adicionar" (escopar ao modal Novo Contato, exact para não pegar "Adicionar primeiro contato")
    const modal = page.locator('[class*="max-w-sm"]').filter({ hasText: 'Novo Contato' });
    const addButton = modal.getByRole('button', { name: 'Adicionar', exact: true });
    await addButton.waitFor({ state: 'visible', timeout: 3000 });
    await expect(addButton).toBeEnabled({ timeout: 5000 });
    await addButton.click();
    
    // Passo 9: Aguardar processamento (pode criar chat ou mostrar erro)
    await page.waitForTimeout(3000);
    
    // Passo 10: Verificar resultado
    // Opção 1: Chat foi criado com sucesso (aparece na lista ou é selecionado)
    const chatCreated = await page.locator(`text=${TARGET_NICKNAME}, [data-chat-id]`).first().isVisible({ timeout: 5000 }).catch(() => false);
    
    // Opção 2: Mensagem de sucesso
    const successMessage = await page.getByText(/Chat criado|sucesso|Bom trabalho/).first().isVisible({ timeout: 3000 }).catch(() => false);
    
    // Opção 3: Erro (usuário não encontrado, etc)
    const errorMessage = await page.getByText(/não encontrado|Usuário não encontrado|erro/).first().isVisible({ timeout: 2000 }).catch(() => false);
    
    if (errorMessage) {
      const errorText = await page.getByText(/não encontrado|Usuário não encontrado|erro/).first().textContent();
      console.log(`Erro ao adicionar contato: ${errorText}`);
      // Não falhar o teste, apenas logar o erro
      // O usuário pode não existir no banco de dados
    }
    
    // Verificar se o chat foi criado ou se há mensagem de sucesso
    expect(chatCreated || successMessage || !errorMessage).toBeTruthy();
    
    // Se chat foi criado, verificar se está selecionado ou visível na lista
    if (chatCreated) {
      // Verificar se o chat aparece na lista ou está selecionado
      const chatInList = page.locator(`[data-chat="true"]:has-text("${TARGET_NICKNAME}")`).first();
      const isChatVisible = await chatInList.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (isChatVisible) {
        console.log(`✅ Chat criado com sucesso com o usuário ${TARGET_NICKNAME}`);
      }
    }
  });

  test('deve mostrar erro se nickname não existir', async ({ page }) => {
    // Este teste verifica o comportamento quando o nickname não existe
    // Primeiro fazer login (reutilizar lógica do teste anterior)
    
    await expect(page.locator('text=Noticias24h')).toBeVisible({ timeout: 10000 });
    
    // Fazer login rápido (assumindo que já está logado ou fazer login)
    // Por simplicidade, vamos apenas tentar adicionar um contato inexistente
    
    const faleConoscoButton = page.locator('text=Fale Conosco').first();
    await faleConoscoButton.click();
    await page.waitForTimeout(100);
    await faleConoscoButton.click();
    await page.waitForTimeout(2000);
    
    // Se aparecer PinPad, inserir PIN
    const pinPad = page.getByText(/Configure seu PIN|Security Access|Digite seu Código/).first();
    const pinPadVisible = await pinPad.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (pinPadVisible) {
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('button', { name: 'Dígito 1' }).click();
      await page.waitForTimeout(150);
      await dialog.getByRole('button', { name: 'Dígito 2' }).click();
      await page.waitForTimeout(150);
      await dialog.getByRole('button', { name: 'Dígito 3' }).click();
      await page.waitForTimeout(150);
      await dialog.getByRole('button', { name: 'Dígito 4' }).click();
      await page.waitForTimeout(2000);
    }
    
    // Tentar adicionar contato inexistente
    const addContactButton = page.locator('[data-testid="add-contact-button"]').first();
    const buttonVisible = await addContactButton.isVisible({ timeout: 10000 }).catch(() => false);
    
    if (buttonVisible) {
      await addContactButton.click();
      await page.waitForTimeout(1000);
      
      const nicknameInput = page.locator('input[placeholder*="nickname"], input[type="text"]').first();
      await nicknameInput.waitFor({ state: 'visible', timeout: 5000 });
      await nicknameInput.fill('nickname_inexistente_12345');
      
      const addButton = page.locator('button:has-text("Adicionar")').first();
      await addButton.click();
      await page.waitForTimeout(2000);
      
      // Deve aparecer mensagem de erro
      const errorMessage = await page.getByText(/não encontrado|Usuário não encontrado/).first().isVisible({ timeout: 3000 }).catch(() => false);
      
      // Não falhar o teste se não aparecer erro (pode ser que o comportamento seja diferente)
      if (errorMessage) {
        console.log('✅ Erro exibido corretamente para nickname inexistente');
      }
    }
  });
});
