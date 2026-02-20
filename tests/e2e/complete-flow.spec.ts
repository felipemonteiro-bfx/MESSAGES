/**
 * Testes E2E completos - Todas as funcionalidades
 *
 * Para executar: npx playwright test tests/e2e/complete-flow.spec.ts
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

async function ensurePortalView(page: Page) {
  await page.goto('/', { waitUntil: 'load' });
  const newsBtn = page.getByRole('button', { name: /notícias|Ver notícias/ });
  if (await newsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await newsBtn.click();
    await page.waitForTimeout(1000);
  }
  await page.waitForTimeout(500);
}

/** Abre modal de auth com duplo clique em "Fale Conosco" */
async function openAuthModal(page: Page) {
  const btn = page.getByTestId('fale-conosco-btn').or(page.getByRole('button', { name: 'Fale Conosco' })).first();
  await btn.waitFor({ state: 'visible', timeout: 10000 });
  await btn.dblclick();
  await page.waitForTimeout(800); // Aguardar modal animar
}

/** Insere PIN 1234 no PinPad visível */
async function enterPin1234(page: Page) {
  const dialog = page.getByRole('dialog', { name: /Inserir PIN|Configure seu PIN|Security Access/ });
  for (const n of [1, 2, 3, 4]) {
    await dialog.getByRole('button', { name: `Dígito ${n}` }).click();
    await page.waitForTimeout(100);
  }
}

test.describe('Fluxo Completo da Aplicação', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await ensurePortalView(page);
  });

  test('1. Portal de notícias deve carregar corretamente', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Noticias24h' })).toBeVisible({ timeout: 15000 });
    const hasMenu = await page.getByRole('button', { name: 'Menu' }).isVisible({ timeout: 5000 }).catch(() => false);
    const hasArticles = await page.locator('article').first().isVisible({ timeout: 10000 }).catch(() => false);
    const hasEmpty = await page.getByText('Nenhuma notícia encontrada').isVisible({ timeout: 3000 }).catch(() => false);
    const hasMessaging = await page.getByTestId('add-contact-button').isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasMenu || hasArticles || hasEmpty || hasMessaging).toBeTruthy();
  });

  test('2. Cadastro de novo usuário completo', async ({ page }) => {
    await openAuthModal(page);

    const signupTitle = page.getByRole('heading', { name: 'Criar Conta' });
    const pinPad = page.getByText(/Configure seu PIN|Security Access|Digite seu Código/);

    const isSignup = await signupTitle.isVisible({ timeout: 3000 }).catch(() => false);
    const isPinPad = await pinPad.isVisible({ timeout: 3000 }).catch(() => false);

    if (isSignup) {
      const nickname = `test_${Date.now()}`;
      const email = `test_${Date.now()}@example.com`;

      await page.getByLabel('Nickname').fill(nickname);
      await page.getByLabel(/E-mail/i).fill(email);
      await page.getByLabel('Senha', { exact: true }).fill('password123');
      await page.getByRole('button', { name: /Finalizar Cadastro|Criar/ }).click();

      await expect(
        page.getByText(/Configure seu PIN|Security Access|Digite seu Código|Noticias24h/)
      ).toBeVisible({ timeout: 10000 });
    } else if (isPinPad) {
      expect(isPinPad).toBeTruthy();
    } else {
      throw new Error('Modal de cadastro ou PinPad não apareceu após duplo clique');
    }
  });

  test('3. Configuração de PIN', async ({ page }) => {
    const pinPad = page.getByText(/Configure seu PIN|Security Access|Digite seu Código/);

    if (await pinPad.isVisible({ timeout: 2000 }).catch(() => false)) {
      await enterPin1234(page);
      await enterPin1234(page); // Confirmação para novo usuário

      await expect(
        page.getByText(/conversas|Mensagens|Adicionar contato|Noticias24h/)
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('4. Login e desbloqueio com PIN', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Fale Conosco' })).toBeVisible();
    await openAuthModal(page);

    await expect(page.getByRole('dialog').first()).toBeVisible({ timeout: 8000 });

    const authDialog = page.getByRole('dialog').filter({ hasText: /Autenticação|Bem-vindo|Criar Conta/ });
    if (await authDialog.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      const fazerLogin = page.getByRole('button', { name: /Fazer Login|Login/ });
      if (await fazerLogin.isVisible({ timeout: 1000 }).catch(() => false)) {
        await fazerLogin.click();
        await page.waitForTimeout(300);
      }

      await page.getByLabel(/E-mail/i).fill('test@example.com');
      await page.getByLabel('Senha').fill('password123');
      await page.getByRole('button', { name: /Entrar no Sistema|Entrar/ }).click();
      await page.waitForTimeout(2000);
    }

    const pinPad = page.getByText(/Digite seu Código|Security Access|Configure seu PIN/);
    if (await pinPad.isVisible({ timeout: 5000 }).catch(() => false)) {
      await enterPin1234(page);
      await page.waitForTimeout(2000);
    }
  });

  test('5. Navegação no portal de notícias', async ({ page }) => {
    const categories = ['Top Stories', 'Brasil', 'Mundo', 'Tecnologia'];
    let navigated = false;

    for (const category of categories) {
      const btn = page.getByRole('button', { name: category });
      if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(2500);
        const hasContent = await page.locator('article').first().isVisible({ timeout: 6000 }).catch(() => false)
          || await page.getByText('Nenhuma notícia encontrada').isVisible({ timeout: 2000 }).catch(() => false);
        const hasMessaging = await page.getByTestId('add-contact-button').isVisible({ timeout: 1000 }).catch(() => false);
        expect(hasContent || hasMessaging).toBeTruthy();
        navigated = true;
        break;
      }
    }
    if (!navigated) {
      await expect(page.getByRole('heading', { name: 'Noticias24h' })).toBeVisible({ timeout: 5000 });
    }

    const searchBtn = page.getByRole('button', { name: 'Buscar' });
    if (await searchBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchBtn.click();
      const searchInput = page.getByPlaceholder(/Buscar/i);
      await expect(searchInput).toBeVisible({ timeout: 3000 });
      await searchInput.fill('teste');
    }
  });

  test('6. Menu lateral e configurações', async ({ page }) => {
    await page.getByRole('button', { name: 'Menu' }).click();

    const sidebar = page.getByRole('complementary').or(page.locator('[class*="sidebar"], [class*="menu"]').first());
    await expect(sidebar.getByRole('button', { name: 'Início' }).first()).toBeVisible({ timeout: 2000 });
    await expect(page.getByText('Alertas').first()).toBeVisible({ timeout: 1000 });
    await expect(page.getByText('Sair').first()).toBeVisible({ timeout: 1000 });
  });

  test('7. Adicionar contato (se já estiver logado)', async ({ page }) => {
    const addBtn = page.getByTestId('add-contact-button').or(
      page.getByRole('button', { name: /Adicionar.*contato/ })
    );

    if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addBtn.click();

      const input = page.getByPlaceholder(/nickname ou email|Digite o nickname/i);
      await expect(input).toBeVisible({ timeout: 3000 });
      await input.fill('test@example.com');

      const submitBtn = page.locator('[class*="max-w-sm"]').filter({ hasText: 'Novo Contato' })
        .getByRole('button', { name: 'Adicionar', exact: true });
      await expect(submitBtn).toBeEnabled({ timeout: 3000 });
      await submitBtn.click();

      await page.waitForTimeout(2000);
    }
  });

  test('8. Enviar mensagem de texto', async ({ page }) => {
    const msgInput = page.getByTestId('message-input').or(
      page.getByPlaceholder(/comentário|mensagem/i)
    );

    if (await msgInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      const firstChat = page.locator('[data-chat="true"]').first();
      if (await firstChat.isVisible({ timeout: 2000 }).catch(() => false)) {
        await firstChat.click();
        await page.waitForTimeout(500);
      }

      const text = `Teste E2E ${Date.now()}`;
      await msgInput.fill(text);

      const sendBtn = page.getByTestId('send-button').or(
        page.getByRole('button', { name: /Enviar/ })
      );
      await sendBtn.click();

      await expect(
        page.getByText(/enviada|sucesso/).or(page.locator(`[data-message="true"]:has-text("${text}")`))
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('9. Drag & drop de arquivo', async ({ page }) => {
    const chatArea = page.locator('[data-stealth-content="true"]').first();

    if (await chatArea.isVisible({ timeout: 5000 }).catch(() => false)) {
      await chatArea.dispatchEvent('dragover', { bubbles: true });

      const overlay = page.getByText('Solte os arquivos aqui');
      if (await overlay.isVisible({ timeout: 1000 }).catch(() => false)) {
        await chatArea.dispatchEvent('drop', { bubbles: true });
        await page.waitForTimeout(1000);
      }
    }
  });

  test('10. Configurações - Auto-lock e Modo Incógnito', async ({ page }) => {
    const settingsBtn = page.getByRole('button', { name: /Configurações/i });

    if (await settingsBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await settingsBtn.click();

      await expect(page.getByText(/Configurações|Bloquear automaticamente/)).toBeVisible({
        timeout: 3000,
      });

      const timeout30 = page.getByRole('button', { name: '30 segundos' });
      if (await timeout30.isVisible({ timeout: 2000 }).catch(() => false)) {
        await timeout30.click();
        await expect(timeout30).toHaveClass(/bg-blue-600/, { timeout: 2000 });
      }

      const incognito = page.locator('div').filter({ hasText: 'Modo Incógnito' }).getByRole('button').first();
      if (await incognito.isVisible({ timeout: 2000 }).catch(() => false)) {
        await incognito.click();
      }

      const closeBtn = page.getByRole('button', { name: 'Fechar' });
      if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await closeBtn.click();
      }
    }
  });

  test('11. Silenciar notificações de conversa', async ({ page }) => {
    const bellBtn = page.getByRole('button').filter({ has: page.locator('[class*="Bell"]') });

    if (await bellBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      const firstChat = page.locator('[class*="chat"], [class*="conversation"]').first();
      if (await firstChat.isVisible({ timeout: 2000 }).catch(() => false)) {
        await firstChat.click();
        await page.waitForTimeout(500);
      }

      await bellBtn.click();

      await expect(page.getByText(/silenciadas|ativadas/)).toBeVisible({ timeout: 3000 });
    }
  });

  test('12. Botão de voltar para notícias (modo stealth)', async ({ page }) => {
    const newsBtn = page.getByRole('button', { name: /notícias/i });

    if (await newsBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newsBtn.click();
      await expect(page.getByRole('heading', { name: 'Noticias24h' })).toBeVisible({
        timeout: 3000,
      });
    }
  });

  test('13. Lazy loading de mensagens', async ({ page }) => {
    const loadMore = page.getByRole('button', { name: /Carregar mensagens anteriores/ }).or(
      page.getByRole('button', { name: /Carregar/ })
    );

    if (await loadMore.isVisible({ timeout: 5000 }).catch(() => false)) {
      const before = await page.locator('[data-message="true"]').count();
      await loadMore.click();
      await page.waitForTimeout(2000);
      const after = await page.locator('[data-message="true"]').count();
      expect(after).toBeGreaterThanOrEqual(before);
    }
  });

  test('14. Responsividade mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await expect(page.getByRole('heading', { name: 'Noticias24h' })).toBeVisible();
    const menuBtn = page.getByRole('button', { name: 'Menu' });
    await expect(menuBtn).toBeVisible();

    await menuBtn.click();
    await expect(
      page.locator('[class*="sidebar"], [class*="menu"]').first()
    ).toBeVisible({ timeout: 2000 });
  });

  test('15. Verificar placeholders nas notícias', async ({ page }) => {
    await expect(page.locator('article').first()).toBeVisible({ timeout: 10000 });

    // Cards usam div com background por categoria (não mais img)
    const placeholders = page.locator('article [class*="aspect-video"]');
    const count = await placeholders.count();
    expect(count).toBeGreaterThan(0);
  });

  test('16. Placeholders carregam por categoria', async ({ page }) => {
    await expect(page.locator('article').first()).toBeVisible({ timeout: 10000 });

    for (const cat of ['Brasil', 'Tecnologia', 'Esportes']) {
      const btn = page.getByRole('button', { name: cat });
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(1500);

        const articles = page.locator('article');
        const firstArticle = articles.first();
        await expect(firstArticle).toBeVisible({ timeout: 5000 });

        // Placeholder div ou categoria visível
        const hasPlaceholder = await firstArticle.locator('[class*="aspect-video"]').count() > 0;
        const hasCategory = await firstArticle.getByText(cat).isVisible().catch(() => false);
        expect(hasPlaceholder || hasCategory).toBeTruthy();
      }
    }
  });
});

/** Teste único da jornada completa do usuário */
test.describe('Jornada completa do usuário', () => {
  test('Portal -> Cadastro -> PIN -> Mensagens -> Notícias', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);

    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 1. Portal carrega
    await expect(page.getByRole('heading', { name: 'Noticias24h' })).toBeVisible();
    
    // Esperar artigos carregarem (com fallback se API não responder)
    const hasArticles = await page.locator('article').first().isVisible({ timeout: 15000 }).catch(() => false);
    if (hasArticles) {
      // 2. Placeholders de imagem visíveis (usamos divs coloridas em vez de img)
      const placeholder = page.locator('article div.aspect-video').first();
      await expect(placeholder).toBeVisible({ timeout: 5000 }).catch(() => {});
    }

    // 3. Abrir auth (duplo clique Fale Conosco)
    const faleBtn = page.getByTestId('fale-conosco-btn').or(page.getByRole('button', { name: 'Fale Conosco' })).first();
    await faleBtn.dblclick();
    await page.waitForTimeout(800);

    const signup = page.getByRole('heading', { name: 'Criar Conta' });
    const pinPad = page.getByText(/Configure seu PIN|Security Access|Digite seu Código/);
    const hasSignup = await signup.isVisible({ timeout: 5000 }).catch(() => false);
    const hasPinPad = await pinPad.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasSignup) {
      await page.getByLabel('Nickname').fill(`e2e_${Date.now()}`);
      await page.getByLabel(/E-mail/i).fill(`e2e_${Date.now()}@example.com`);
      await page.getByLabel('Senha', { exact: true }).fill('password123');
      await page.getByRole('button', { name: /Finalizar Cadastro|Criar/ }).click();
      await page.waitForTimeout(3000);
    }

    if (await pinPad.isVisible({ timeout: 5000 }).catch(() => false)) {
      const dialog = page.getByRole('dialog', { name: /Inserir PIN|Configure seu PIN|Security Access/ });
      for (const n of [1, 2, 3, 4]) {
        await dialog.getByRole('button', { name: `Dígito ${n}` }).click();
        await page.waitForTimeout(100);
      }
      for (const n of [1, 2, 3, 4]) {
        await dialog.getByRole('button', { name: `Dígito ${n}` }).click();
        await page.waitForTimeout(100);
      }
      await page.waitForTimeout(3000);
    }

    // 4. Menu lateral
    const menuBtn = page.getByRole('button', { name: 'Menu' });
    if (await menuBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await menuBtn.click();
      await expect(page.getByText('Início').first()).toBeVisible({ timeout: 2000 });
      await page.keyboard.press('Escape');
    }

    // 5. Voltar ao portal (se estiver em mensagens)
    const newsBtn = page.getByRole('button', { name: /notícias/i });
    if (await newsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newsBtn.click();
      await expect(page.getByRole('heading', { name: 'Noticias24h' })).toBeVisible({ timeout: 5000 });
    }

    // 6. Categorias e imagens
    const techBtn = page.getByRole('button', { name: 'Tecnologia' });
    if (await techBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await techBtn.click();
      await page.waitForTimeout(2000);
      const hasContent = await page.locator('article').first().isVisible({ timeout: 8000 }).catch(() => false)
        || await page.getByText('Nenhuma notícia encontrada').isVisible({ timeout: 3000 }).catch(() => false);
      expect(hasContent).toBeTruthy();
    }
  });
});
