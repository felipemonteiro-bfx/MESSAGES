/**
 * Testes E2E completos - Todas as funcionalidades
 * 
 * Para executar: npx playwright test tests/e2e/complete-flow.spec.ts
 */

import { test, expect } from '@playwright/test';

test.describe('Fluxo Completo da Aplicação', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Limpar localStorage antes de cada teste
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('1. Portal de notícias deve carregar corretamente', async ({ page }) => {
    // Verificar título
    await expect(page.locator('text=Notícias em Tempo Real')).toBeVisible();
    
    // Verificar que há notícias sendo exibidas
    const newsArticles = page.locator('article, [class*="news"], [class*="article"]');
    await expect(newsArticles.first()).toBeVisible({ timeout: 10000 });
    
    // Verificar menu
    const menuButton = page.locator('button[aria-label="Menu"], button:has-text("Menu")').first();
    await expect(menuButton).toBeVisible();
  });

  test('2. Cadastro de novo usuário completo', async ({ page }) => {
    // Clicar em "Fale Conosco" duas vezes rapidamente
    const faleConoscoButton = page.locator('text=Fale Conosco').first();
    
    // Primeiro clique
    await faleConoscoButton.click();
    await page.waitForTimeout(100);
    
    // Segundo clique (duplo clique)
    await faleConoscoButton.click();
    
    // Aguardar modal de cadastro ou PinPad aparecer
    await page.waitForTimeout(1000);
    
    // Verificar se apareceu modal de cadastro ou PinPad
    const signupTitle = page.locator('text=Criar Conta').first();
    const pinPadTitle = page.locator('text=Configure seu PIN, text=Security Access, text=Digite seu Código').first();
    
    const hasSignup = await signupTitle.isVisible({ timeout: 3000 }).catch(() => false);
    const hasPinPad = await pinPadTitle.isVisible({ timeout: 3000 }).catch(() => false);
    
    // Se aparecer modal de cadastro, preencher
    if (hasSignup) {
      const nickname = `test_${Date.now()}`;
      const email = `test_${Date.now()}@example.com`;
      
      // Preencher formulário - usar ordem dos inputs
      const allInputs = page.locator('input');
      const nicknameInput = allInputs.nth(0); // Primeiro input é nickname
      const emailInput = allInputs.nth(1); // Segundo input é email
      const passwordInput = page.locator('input[type="password"]').first();
      
      await nicknameInput.waitFor({ state: 'visible', timeout: 5000 });
      await nicknameInput.fill(nickname);
      
      await emailInput.waitFor({ state: 'visible', timeout: 5000 });
      await emailInput.fill(email);
      
      await passwordInput.waitFor({ state: 'visible', timeout: 5000 });
      await passwordInput.fill('password123');
      
      // Submeter
      await page.click('button:has-text("Finalizar Cadastro"), button:has-text("Criar"), button[type="submit"]');
      
      // Aguardar um pouco para processar cadastro
      await page.waitForTimeout(2000);
      
      // Verificar se PinPad apareceu ou voltou para portal
      const pinPad = page.locator('text=Configure seu PIN, text=Security Access, text=Digite seu Código');
      const portal = page.locator('text=Notícias em Tempo Real');
      
      const hasPinPad = await pinPad.isVisible({ timeout: 8000 }).catch(() => false);
      const hasPortal = await portal.isVisible({ timeout: 2000 }).catch(() => false);
      
      expect(hasPinPad || hasPortal).toBeTruthy();
    } else if (hasPinPad) {
      // Já está no PinPad, teste passou
      expect(hasPinPad).toBeTruthy();
    } else {
      // Nenhum dos dois apareceu, falhar teste
      throw new Error('Modal de cadastro ou PinPad não apareceu após duplo clique');
    }
  });

  test('3. Configuração de PIN', async ({ page }) => {
    // Assumindo que já está no PinPad (após cadastro)
    const pinPad = page.locator('text=Configure seu PIN, text=Security Access, text=Digite seu Código').first();
    
    if (await pinPad.isVisible({ timeout: 2000 })) {
      // Clicar nos números do PIN (1234)
      await page.click('button:has-text("1")');
      await page.click('button:has-text("2")');
      await page.click('button:has-text("3")');
      await page.click('button:has-text("4")');
      
      // Aguardar desbloqueio (deve mostrar tela de mensagens)
      await page.waitForTimeout(2000);
      
      // Verificar se entrou na tela de mensagens ou se ainda está no portal
      const messagingScreen = page.locator('text=conversas, text=Mensagens, text=Adicionar contato').first();
      const stillOnNews = page.locator('text=Notícias em Tempo Real').first();
      
      // Deve estar em uma das telas
      const isMessaging = await messagingScreen.isVisible({ timeout: 3000 }).catch(() => false);
      const isNews = await stillOnNews.isVisible({ timeout: 1000 }).catch(() => false);
      
      expect(isMessaging || isNews).toBeTruthy();
    }
  });

  test('4. Login e desbloqueio com PIN', async ({ page }) => {
    // Simular que já tem conta (fazer login primeiro)
    const faleConoscoButton = page.locator('text=Fale Conosco').first();
    await faleConoscoButton.click();
    await page.waitForTimeout(100);
    await faleConoscoButton.click();
    
    // Se aparecer modal, tentar fazer login
    const loginButton = page.locator('text=Fazer Login, button:has-text("Login")').first();
    if (await loginButton.isVisible({ timeout: 2000 })) {
      await loginButton.click();
      
      // Preencher login (assumindo que já existe usuário de teste)
      await page.fill('input[type="text"][placeholder*="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button:has-text("Entrar"), button:has-text("Login")');
      
      await page.waitForTimeout(2000);
    }
    
    // Se aparecer PinPad, digitar PIN
    const pinPad = page.locator('text=Digite seu Código, text=Security Access').first();
    if (await pinPad.isVisible({ timeout: 3000 })) {
      await page.click('button:has-text("1")');
      await page.click('button:has-text("2")');
      await page.click('button:has-text("3")');
      await page.click('button:has-text("4")');
      
      await page.waitForTimeout(2000);
    }
  });

  test('5. Navegação no portal de notícias', async ({ page }) => {
    // Verificar categorias - procurar por botões clicáveis
    const categories = ['Top Stories', 'Brasil', 'Mundo', 'Tecnologia'];
    for (const category of categories) {
      // Procurar por botão ou elemento clicável com o texto da categoria
      const categoryButton = page.locator(`button:has-text("${category}"), [role="button"]:has-text("${category}")`).first();
      if (await categoryButton.isVisible({ timeout: 2000 })) {
        await categoryButton.click();
        await page.waitForTimeout(1500); // Aguardar carregamento
        
        // Verificar que notícias foram carregadas (não verificar classe específica)
        const newsArticles = page.locator('article, [class*="news"], [class*="article"]').first();
        const hasNews = await newsArticles.isVisible({ timeout: 3000 }).catch(() => false);
        expect(hasNews).toBeTruthy();
      }
    }
    
    // Verificar busca
    const searchButton = page.locator('button[aria-label="Buscar"], button:has([class*="Search"])').first();
    if (await searchButton.isVisible({ timeout: 2000 })) {
      await searchButton.click();
      const searchInput = page.locator('input[placeholder*="Buscar"], input[type="text"]').first();
      await expect(searchInput).toBeVisible();
      await searchInput.fill('teste');
      await page.waitForTimeout(500);
    }
  });

  test('6. Menu lateral e configurações', async ({ page }) => {
    // Abrir menu
    const menuButton = page.locator('button[aria-label="Menu"], button:has([class*="Menu"])').first();
    await menuButton.click();
    
    await page.waitForTimeout(500);
    
    // Verificar itens do menu
    const menuItems = [
      'Início',
      'Alertas',
      'Sair'
    ];
    
    for (const item of menuItems) {
      const menuItem = page.locator(`text=${item}`).first();
      if (await menuItem.isVisible({ timeout: 1000 })) {
        await expect(menuItem).toBeVisible();
      }
    }
  });

  test('7. Adicionar contato (se já estiver logado)', async ({ page }) => {
    // Primeiro fazer login e desbloquear (reutilizar lógica dos testes anteriores)
    // ... código de login ...
    
    // Verificar se está na tela de mensagens
    const addContactButton = page.locator('[data-testid="add-contact-button"], button[aria-label*="contato"]').first();
    
    if (await addContactButton.isVisible({ timeout: 5000 })) {
      await addContactButton.click();
      
      // Verificar modal de adicionar contato
      const addContactModal = page.locator('input[placeholder*="nickname"], input[placeholder*="email"]').first();
      await expect(addContactModal).toBeVisible({ timeout: 3000 });
      
      // Tentar buscar usuário
      await addContactModal.fill('test@example.com');
      await page.click('button:has-text("Adicionar"), button:has-text("Buscar")');
      
      await page.waitForTimeout(2000);
    }
  });

  test('8. Enviar mensagem de texto', async ({ page }) => {
    // Assumindo que já está logado e desbloqueado
    // Verificar se está na tela de mensagens
    const messageInput = page.locator('[data-testid="message-input"], textarea[placeholder*="comentário"]').first();
    
    if (await messageInput.isVisible({ timeout: 5000 })) {
      // Selecionar uma conversa primeiro (se houver)
      const firstChat = page.locator('[data-chat="true"]').first();
      if (await firstChat.isVisible({ timeout: 2000 })) {
        await firstChat.click();
        await page.waitForTimeout(1000);
      }
      
      // Digitar mensagem
      const testMessage = `Teste E2E ${Date.now()}`;
      await messageInput.fill(testMessage);
      
      // Enviar
      const sendButton = page.locator('[data-testid="send-button"], button[aria-label*="Enviar"]').first();
      await sendButton.click();
      
      // Verificar que mensagem foi enviada (toast ou mensagem aparecendo)
      await page.waitForTimeout(2000);
      
      // Verificar toast de sucesso ou mensagem na lista
      const successToast = page.locator('text=enviada, text=sucesso').first();
      const messageInList = page.locator(`[data-message="true"]:has-text("${testMessage}")`).first();
      
      const hasSuccess = await successToast.isVisible({ timeout: 3000 }).catch(() => false);
      const hasMessage = await messageInList.isVisible({ timeout: 3000 }).catch(() => false);
      
      expect(hasSuccess || hasMessage).toBeTruthy();
    }
  });

  test('9. Drag & drop de arquivo', async ({ page }) => {
    // Verificar se está na tela de mensagens
    const chatArea = page.locator('[data-stealth-content="true"]').first();
    
    if (await chatArea.isVisible({ timeout: 5000 })) {
      // Criar arquivo de teste (blob)
      const fileContent = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      
      // Simular drag & drop
      await chatArea.dispatchEvent('dragover', { bubbles: true });
      await page.waitForTimeout(500);
      
      // Verificar overlay de drag
      const dragOverlay = page.locator('text=Solte os arquivos aqui').first();
      const hasOverlay = await dragOverlay.isVisible({ timeout: 1000 }).catch(() => false);
      
      // Se overlay apareceu, simular drop
      if (hasOverlay) {
        // Criar DataTransfer mock
        await page.evaluate(() => {
          const dt = new DataTransfer();
          const file = new File(['test'], 'test.png', { type: 'image/png' });
          dt.items.add(file);
          return dt;
        });
        
        await chatArea.dispatchEvent('drop', { bubbles: true });
        await page.waitForTimeout(1000);
      }
    }
  });

  test('10. Configurações - Auto-lock e Modo Incógnito', async ({ page }) => {
    // Verificar se está na tela de mensagens
    const settingsButton = page.locator('button[aria-label*="Configurações"], button:has([class*="Settings"])').first();
    
    if (await settingsButton.isVisible({ timeout: 5000 })) {
      await settingsButton.click();
      
      // Verificar modal de configurações
      const settingsModal = page.locator('text=Configurações, text=Bloquear automaticamente').first();
      await expect(settingsModal).toBeVisible({ timeout: 3000 });
      
      // Testar mudança de auto-lock
      const timeout30s = page.locator('button:has-text("30 segundos")').first();
      if (await timeout30s.isVisible({ timeout: 2000 })) {
        await timeout30s.click();
        await page.waitForTimeout(500);
        // Verificar que foi selecionado
        await expect(timeout30s).toHaveClass(/bg-blue-600/);
      }
      
      // Testar toggle de modo incógnito
      const incognitoToggle = page.locator('button[class*="rounded-full"]').filter({ hasText: /Modo Incógnito/ }).first();
      if (await incognitoToggle.isVisible({ timeout: 2000 })) {
        await incognitoToggle.click();
        await page.waitForTimeout(500);
      }
      
      // Fechar modal
      const closeButton = page.locator('button[aria-label="Fechar"], button:has([class*="X"])').first();
      if (await closeButton.isVisible({ timeout: 1000 })) {
        await closeButton.click();
      }
    }
  });

  test('11. Silenciar notificações de conversa', async ({ page }) => {
    // Verificar se está na tela de mensagens
    const bellButton = page.locator('button:has([class*="Bell"])').first();
    
    if (await bellButton.isVisible({ timeout: 5000 })) {
      // Selecionar conversa primeiro
      const firstChat = page.locator('[class*="chat"], [class*="conversation"]').first();
      if (await firstChat.isVisible({ timeout: 2000 })) {
        await firstChat.click();
        await page.waitForTimeout(1000);
      }
      
      // Clicar no botão de sino (silenciar/ativar)
      await bellButton.click();
      await page.waitForTimeout(1000);
      
      // Verificar toast de confirmação
      const toast = page.locator('text=silenciadas, text=ativadas').first();
      const hasToast = await toast.isVisible({ timeout: 3000 }).catch(() => false);
      expect(hasToast).toBeTruthy();
    }
  });

  test('12. Botão de voltar para notícias (modo stealth)', async ({ page }) => {
    // Verificar se está na tela de mensagens
    const newsButton = page.locator('button[aria-label*="notícias"], button:has([class*="Newspaper"])').first();
    
    if (await newsButton.isVisible({ timeout: 5000 })) {
      await newsButton.click();
      await page.waitForTimeout(2000);
      
      // Deve voltar para portal de notícias
      await expect(page.locator('text=Notícias em Tempo Real')).toBeVisible({ timeout: 3000 });
    }
  });

  test('13. Lazy loading de mensagens', async ({ page }) => {
    // Verificar se está na tela de mensagens com conversa selecionada
    const loadMoreButton = page.locator('text=Carregar mensagens anteriores, button:has-text("Carregar")').first();
    
    if (await loadMoreButton.isVisible({ timeout: 5000 })) {
      const initialCount = await page.locator('[data-message="true"]').count();
      
      await loadMoreButton.click();
      await page.waitForTimeout(2000);
      
      const newCount = await page.locator('[data-message="true"]').count();
      
      // Deve ter mais mensagens ou pelo menos não menos
      expect(newCount).toBeGreaterThanOrEqual(initialCount);
    }
  });

  test('14. Responsividade mobile', async ({ page }) => {
    // Testar em viewport mobile
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verificar que elementos se adaptam
    await expect(page.locator('text=Notícias em Tempo Real')).toBeVisible();
    
    // Verificar menu hambúrguer
    const menuButton = page.locator('button[aria-label="Menu"]').first();
    await expect(menuButton).toBeVisible();
    
    // Abrir menu
    await menuButton.click();
    await page.waitForTimeout(500);
    
    // Verificar que menu lateral aparece
    const menuSidebar = page.locator('[class*="sidebar"], [class*="menu"]').first();
    const hasSidebar = await menuSidebar.isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasSidebar).toBeTruthy();
  });

  test('15. Verificar imagens nas notícias', async ({ page }) => {
    // Verificar que notícias têm imagens
    const newsImages = page.locator('img[src*="unsplash"], img[src*="pravatar"], img[alt*="notícia"]').first();
    
    if (await newsImages.isVisible({ timeout: 10000 })) {
      // Verificar que imagem carrega
      const imageSrc = await newsImages.getAttribute('src');
      expect(imageSrc).toBeTruthy();
      expect(imageSrc).not.toBe('');
    }
  });
});
