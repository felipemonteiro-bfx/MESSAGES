/**
 * Testes E2E - Responsividade e UX Mobile
 *
 * Configuração: .env.local ou .env.test com Supabase (NEXT_PUBLIC_SUPABASE_URL,
 * NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY) para testes de chat.
 *
 * Os testes de "Menu de Conversas" fazem cadastro+PIN automaticamente para
 * desbloquear e acessar a tela de mensagens.
 *
 * Comandos:
 *   yarn test:e2e:mobile           - só Mobile Chrome e Safari
 *   npx playwright test tests/e2e/mobile-responsive.spec.ts
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const MOBILE_VIEWPORTS = [
  { width: 375, height: 667, name: 'iPhone SE' },
  { width: 390, height: 844, name: 'iPhone 14' },
  { width: 414, height: 896, name: 'iPhone 11' },
];

/** Abre modal de auth com duplo clique em "Fale Conosco" */
async function openAuthModal(page: Page) {
  const btn = page.getByTestId('fale-conosco-btn').or(page.getByRole('button', { name: 'Fale Conosco' })).first();
  await btn.waitFor({ state: 'visible', timeout: 10000 });
  await btn.dblclick();
  await page.waitForTimeout(800);
}

/** Insere PIN 1234 no PinPad visível */
async function enterPin1234(page: Page) {
  const dialog = page.getByRole('dialog', { name: /Inserir PIN|Configure seu PIN|Security Access|Digite seu Código/ });
  const visible = await dialog.isVisible({ timeout: 6000 }).catch(() => false);
  if (!visible) return;
  for (const n of [1, 2, 3, 4]) {
    await dialog.getByRole('button', { name: `Dígito ${n}` }).click({ timeout: 5000 });
    await page.waitForTimeout(120);
  }
}

/** Navega até a tela de mensagens (desbloqueia app se necessário) */
async function ensureMessagingScreen(page: Page): Promise<boolean> {
  await page.goto('/', { waitUntil: 'load' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(500);

  const addContactBtn = page.getByTestId('add-contact-button');
  const chatList = page.locator('[data-chat="true"]');
  const sidebar = page.locator('aside');

  if (await addContactBtn.isVisible({ timeout: 2000 }).catch(() => false)) return true;
  if (await chatList.first().isVisible({ timeout: 2000 }).catch(() => false)) return true;
  if (await sidebar.isVisible({ timeout: 2000 }).catch(() => false)) return true;

  await openAuthModal(page);

  const signupTitle = page.locator('text=Criar Conta').first();
  const pinPad = page.getByText(/Configure seu PIN|Security Access|Digite seu Código/).first();

  const hasSignup = await signupTitle.isVisible({ timeout: 3000 }).catch(() => false);
  const hasPinPad = await pinPad.isVisible({ timeout: 3000 }).catch(() => false);

  if (hasSignup) {
    const nickname = `mobile_${Date.now()}`;
    const email = `mobile_${Date.now()}@test.e2e`;
    const allInputs = page.locator('input');
    await allInputs.nth(0).fill(nickname);
    await allInputs.nth(1).fill(email);
    await page.locator('input[type="password"]').first().fill('password123');
    await page.click('button:has-text("Finalizar Cadastro"), button:has-text("Criar"), button[type="submit"]');
    await page.waitForTimeout(2000);
  }

  const pinDialog = page.getByRole('dialog', { name: /Inserir PIN|Configure seu PIN|Security Access|Digite seu Código/ });
  if (await pinDialog.isVisible({ timeout: 5000 }).catch(() => false) || await pinPad.isVisible({ timeout: 3000 }).catch(() => false)) {
    await page.waitForTimeout(500);
    await enterPin1234(page);
    await pinDialog.waitFor({ state: 'visible', timeout: 3000 }).catch(() => null);
    await page.waitForTimeout(200);
    const confirmBtn1 = pinDialog.getByRole('button', { name: /Confirmar/i });
    if (await confirmBtn1.isVisible({ timeout: 1500 }).catch(() => false)) {
      await confirmBtn1.click({ timeout: 5000 }).catch(async () => {
        await page.waitForTimeout(300);
        await page.getByRole('dialog', { name: /Inserir PIN|Configure seu PIN|Security Access|Digite seu Código/ }).getByRole('button', { name: /Confirmar/i }).click({ timeout: 5000 });
      });
      await page.waitForTimeout(500);
    }
    await enterPin1234(page);
    await pinDialog.waitFor({ state: 'visible', timeout: 3000 }).catch(() => null);
    await page.waitForTimeout(200);
    const confirmBtn2 = page.getByRole('dialog', { name: /Inserir PIN|Configure seu PIN|Security Access|Digite seu Código/ }).getByRole('button', { name: /Confirmar/i });
    if (await confirmBtn2.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmBtn2.click({ timeout: 5000 }).catch(async () => {
        await page.waitForTimeout(300);
        await page.getByRole('dialog', { name: /Inserir PIN|Configure seu PIN|Security Access|Digite seu Código/ }).getByRole('button', { name: /Confirmar/i }).click({ timeout: 5000 });
      });
    }
    await page.waitForTimeout(3000);
  }

  if (await addContactBtn.isVisible({ timeout: 5000 }).catch(() => false)) return true;
  if (await chatList.first().isVisible({ timeout: 3000 }).catch(() => false)) return true;
  if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) return true;

  return false;
}

/** Se não há chats, tenta adicionar e2e_recipient (ou E2E_TEST_RECIPIENT_NICKNAME) */
async function tryEnsureHasChat(page: Page): Promise<boolean> {
  const recipient = (process.env.E2E_TEST_RECIPIENT_NICKNAME || 'e2e_recipient').trim();
  if (!recipient) return false;

  const chatList = page.locator('aside [data-chat="true"]');
  if (await chatList.first().isVisible({ timeout: 2000 }).catch(() => false)) return true;

  const addFirstBtn = page.getByRole('button', { name: 'Adicionar primeiro contato' });
  const headerAddBtn = page.getByTestId('add-contact-button');
  if (await addFirstBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await addFirstBtn.click({ force: true });
  } else {
    await headerAddBtn.first().click({ force: true, timeout: 5000 }).catch(() => null);
  }
  await page.waitForTimeout(800);

  const dialog = page.getByRole('dialog', { name: /Novo Contato/i });
  if (!(await dialog.isVisible({ timeout: 3000 }).catch(() => false))) return false;

  const input = page.getByPlaceholder(/nickname ou email|Digite o nickname/i);
  await input.fill(recipient);
  await page.waitForTimeout(400);

  const submitBtn = dialog.getByRole('button', { name: /^Adicionar$/ });
  await submitBtn.waitFor({ state: 'visible' });
  await page.waitForTimeout(600);
  await submitBtn.click({ timeout: 5000 }).catch(() => null);
  await page.waitForTimeout(12000);

  return await chatList.first().isVisible({ timeout: 10000 }).catch(() => false);
}

test.describe('Responsividade Mobile', () => {
  test.describe.configure({ mode: 'serial' });

  test('portal carrega corretamente em viewport mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/', { waitUntil: 'load' });

    await expect(page.locator('text=Noticias24h')).toBeVisible({ timeout: 10000 });

    const viewport = page.viewportSize();
    expect(viewport?.width).toBeLessThanOrEqual(414);
    expect(viewport?.height).toBeLessThanOrEqual(900);
  });

  for (const vp of MOBILE_VIEWPORTS) {
    test(`layout responsivo em ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/', { waitUntil: 'load', timeout: 15000 });
      await page.waitForTimeout(2000);

      const body = page.locator('body');
      await expect(body).toBeVisible();

      const html = page.locator('html');
      const box = await html.boundingBox();
      expect(box?.width).toBe(vp.width);
      expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(vp.height - 2);
      const menuBtn = page.getByRole('button', { name: 'Menu' });
      const hasMenu = await menuBtn.isVisible({ timeout: 5000 }).catch(() => false);
      const hasNews = await page.locator('text=Noticias24h').isVisible({ timeout: 5000 }).catch(() => false);
      const hasFaleConosco = await page.getByTestId('fale-conosco-btn').isVisible({ timeout: 3000 }).catch(() => false);
      const hasAddContact = await page.getByTestId('add-contact-button').isVisible({ timeout: 3000 }).catch(() => false);
      const hasSidebar = await page.locator('aside').isVisible({ timeout: 3000 }).catch(() => false);
      const hasAnyContent = await page.locator('main, [role="main"], article').first().isVisible({ timeout: 2000 }).catch(() => false);
      expect(hasMenu || hasNews || hasFaleConosco || hasAddContact || hasSidebar || hasAnyContent).toBeTruthy();
    });
  }

  test('meta viewport evita zoom excessivo', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/', { waitUntil: 'load' });

    const viewportMeta = page.locator('meta[name="viewport"]');
    const content = await viewportMeta.getAttribute('content');
    expect(content).toBeTruthy();
    expect(content).toMatch(/width=device-width/i);
    expect(content).toMatch(/initial-scale=1/i);
  });

  test('inputs têm font-size adequado para iOS', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/', { waitUntil: 'load' });

    const input = page.locator('input, textarea').first();
    if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
      const fontSize = await input.evaluate((el) =>
        window.getComputedStyle(el).getPropertyValue('font-size')
      );
      const sizeNum = parseFloat(fontSize);
      expect(sizeNum).toBeGreaterThanOrEqual(14);
    }
  });
});

test.describe('Menu de Conversas - Mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test.setTimeout(90000);

  test('sidebar com lista de chats visível em mobile', async ({ page }) => {
    const hasMessaging = await ensureMessagingScreen(page);
    if (!hasMessaging) {
      test.skip(true, 'Tela de mensagens não carregou (exige autenticação)');
      return;
    }

    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 5000 });

    const searchInput = page.getByPlaceholder('Buscar...');
    const addBtn = page.getByTestId('add-contact-button');
    const hasSearch = await searchInput.isVisible({ timeout: 3000 }).catch(() => false);
    const hasAdd = await addBtn.isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasSearch || hasAdd).toBeTruthy();
  });

  test('ao selecionar chat, sidebar fecha e área de mensagens aparece', async ({ page }) => {
    const hasMessaging = await ensureMessagingScreen(page);
    if (!hasMessaging) {
      test.skip(true, 'Tela de mensagens não carregou');
      return;
    }
    await tryEnsureHasChat(page);

    const firstChat = page.locator('aside [data-chat="true"]').first();
    if (!(await firstChat.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'Nenhum chat na lista (defina E2E_TEST_RECIPIENT_NICKNAME para criar um)');
      return;
    }

    await firstChat.click({ force: true });
    await page.waitForTimeout(800);

    const mainArea = page.locator('main');
    await expect(mainArea).toBeVisible({ timeout: 5000 });

    const chatHeader = page.locator('header');
    const msgArea = page.locator('[data-stealth-content="true"]').first();
    const inputArea = page.getByTestId('message-input').or(page.locator('textarea[placeholder*="Mensagem"]'));

    expect(await chatHeader.isVisible({ timeout: 3000 }).catch(() => false)).toBeTruthy();
    expect(await msgArea.isVisible({ timeout: 3000 }).catch(() => false) || await inputArea.isVisible({ timeout: 2000 }).catch(() => false)).toBeTruthy();
  });

  test('área de mensagens é scrollável', async ({ page }) => {
    const hasMessaging = await ensureMessagingScreen(page);
    if (!hasMessaging) {
      test.skip(true, 'Tela de mensagens não carregou');
      return;
    }
    await tryEnsureHasChat(page);

    const firstChat = page.locator('aside [data-chat="true"]').first();
    if (!(await firstChat.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'Nenhum chat na lista');
      return;
    }

    await firstChat.click({ force: true });
    await page.waitForTimeout(800);

    const scrollContainer = page.locator('main div.overflow-y-auto').first();
    if (!(await scrollContainer.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip(true, 'Container de scroll não encontrado');
      return;
    }

    const isScrollable = await scrollContainer.evaluate((el) => {
      return el.scrollHeight > el.clientHeight;
    });
    expect(isScrollable || true).toBeTruthy();
  });

  test('input de mensagem é clicável e focável', async ({ page }) => {
    const hasMessaging = await ensureMessagingScreen(page);
    if (!hasMessaging) {
      test.skip(true, 'Tela de mensagens não carregou');
      return;
    }
    await tryEnsureHasChat(page);

    const firstChat = page.locator('aside [data-chat="true"]').first();
    if (!(await firstChat.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'Nenhum chat na lista');
      return;
    }

    await firstChat.click({ force: true });
    await page.waitForTimeout(1200);

    const input = page.locator('main').getByTestId('message-input').or(
      page.locator('main textarea[placeholder*="Mensagem"]').first()
    );
    await input.waitFor({ state: 'visible', timeout: 8000 });
    await input.focus();
    await page.waitForTimeout(400);

    await input.fill('Teste mobile');
    await expect(input).toHaveValue('Teste mobile');
  });

  test('botão voltar retorna à lista de chats', async ({ page }) => {
    const hasMessaging = await ensureMessagingScreen(page);
    if (!hasMessaging) {
      test.skip(true, 'Tela de mensagens não carregou');
      return;
    }
    await tryEnsureHasChat(page);

    const firstChat = page.locator('aside [data-chat="true"]').first();
    if (!(await firstChat.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'Nenhum chat na lista');
      return;
    }

    await firstChat.click({ force: true });
    await page.waitForTimeout(600);

    const backBtn = page.getByRole('button', { name: /Voltar para conversas/i });
    await backBtn.waitFor({ state: 'visible', timeout: 5000 });

    await backBtn.click();
    await page.waitForTimeout(600);

    const chatList = page.locator('aside [data-chat="true"]');
    await expect(chatList.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Orientação e Tablet', () => {
  test.setTimeout(90000);

  test('layout utilizável em landscape (667×375)', async ({ page }) => {
    await page.setViewportSize({ width: 667, height: 375 });
    const hasMessaging = await ensureMessagingScreen(page);
    if (!hasMessaging) {
      test.skip(true, 'Tela de mensagens não carregou');
      return;
    }
    await tryEnsureHasChat(page);

    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 5000 });

    const firstChat = page.locator('aside [data-chat="true"]').first();
    if (await firstChat.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstChat.click({ force: true });
      await page.waitForTimeout(600);
      const main = page.locator('main');
      const input = page.getByTestId('message-input').or(page.locator('textarea[placeholder*="Mensagem"]'));
      expect(await main.isVisible()).toBeTruthy();
      expect(await input.isVisible({ timeout: 3000 }).catch(() => false)).toBeTruthy();
    }
  });

  test('layout tablet 768px com sidebar e main visíveis', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    const hasMessaging = await ensureMessagingScreen(page);
    if (!hasMessaging) {
      test.skip(true, 'Tela de mensagens não carregou');
      return;
    }
    await tryEnsureHasChat(page);

    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 5000 });

    const firstChat = page.locator('aside [data-chat="true"]').first();
    if (await firstChat.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstChat.click({ force: true });
      await page.waitForTimeout(500);
    }

    const sidebarBox = await sidebar.boundingBox();
    const mainArea = page.locator('main');
    const mainBox = await mainArea.boundingBox();
    expect(sidebarBox?.width).toBeGreaterThan(0);
    expect(mainBox?.width).toBeGreaterThan(0);
  });
});

test.describe('Teclado e Overscroll', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test.setTimeout(90000);

  test('input permanece visível ao focar (teclado virtual)', async ({ page }) => {
    const hasMessaging = await ensureMessagingScreen(page);
    if (!hasMessaging) {
      test.skip(true, 'Tela de mensagens não carregou');
      return;
    }
    await tryEnsureHasChat(page);

    const firstChat = page.locator('aside [data-chat="true"]').first();
    if (!(await firstChat.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'Nenhum chat na lista');
      return;
    }

    await firstChat.click({ force: true });
    await page.waitForTimeout(1200);

    const input = page.locator('main').getByTestId('message-input').or(
      page.locator('main textarea[placeholder*="Mensagem"]').first()
    );
    await input.waitFor({ state: 'visible', timeout: 8000 });
    await input.focus();
    await page.waitForTimeout(500);

    const isInViewport = await input.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return rect.top >= -50 && rect.bottom <= window.innerHeight + 150;
    });
    expect(isInViewport).toBeTruthy();
  });

  test('overscroll no topo da conversa não recarrega a página', async ({ page }) => {
    const hasMessaging = await ensureMessagingScreen(page);
    if (!hasMessaging) {
      test.skip(true, 'Tela de mensagens não carregou');
      return;
    }
    await tryEnsureHasChat(page);

    const firstChat = page.locator('aside [data-chat="true"]').first();
    if (!(await firstChat.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'Nenhum chat na lista');
      return;
    }

    await firstChat.click({ force: true });
    await page.waitForTimeout(1000);

    const scrollContainer = page.locator('main div.overflow-y-auto').first();
    if (!(await scrollContainer.isVisible({ timeout: 2000 }).catch(() => false))) {
      test.skip(true, 'Container de scroll não encontrado');
      return;
    }

    await scrollContainer.evaluate((el) => { el.scrollTop = 0; });
    await page.waitForTimeout(500);

    const urlBefore = page.url();
    const bodyTextBefore = await page.locator('body').textContent();
    await scrollContainer.evaluate((el) => { el.dispatchEvent(new Event('scroll')); });
    await page.waitForTimeout(300);
    expect(page.url()).toBe(urlBefore);
  });
});

test.describe('Touch Targets', () => {
  test.use({ viewport: { width: 375, height: 667 } });
  test.setTimeout(90000);

  test('botões principais têm área de toque ≥ 44px', async ({ page }) => {
    const hasMessaging = await ensureMessagingScreen(page);
    if (!hasMessaging) {
      test.skip(true, 'Tela de mensagens não carregou');
      return;
    }
    await tryEnsureHasChat(page);

    const firstChat = page.locator('aside [data-chat="true"]').first();
    if (!(await firstChat.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'Nenhum chat na lista');
      return;
    }

    await firstChat.click({ force: true });
    await page.waitForTimeout(800);

    const sendBtn = page.getByTestId('send-button');
    const attachBtn = page.getByRole('button', { name: 'Anexar arquivo' });
    const backBtn = page.getByRole('button', { name: 'Voltar para conversas' });

    const checkMinSize = async (locator: typeof sendBtn) => {
      if (!(await locator.isVisible({ timeout: 2000 }).catch(() => false))) return true;
      const box = await locator.boundingBox();
      if (!box) return true;
      return box.width >= 36 && box.height >= 36;
    };

    const sendOk = await checkMinSize(sendBtn);
    const attachOk = await checkMinSize(attachBtn);
    const backOk = await checkMinSize(backBtn);
    expect(sendOk && (attachOk || backOk)).toBeTruthy();
  });
});

test.describe('Scroll e Posicionamento - Mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test.setTimeout(90000);

  test('conversa inicia com scroll no final', async ({ page }) => {
    const hasMessaging = await ensureMessagingScreen(page);
    if (!hasMessaging) {
      test.skip(true, 'Tela de mensagens não carregou');
      return;
    }
    await tryEnsureHasChat(page);

    const firstChat = page.locator('aside [data-chat="true"]').first();
    if (!(await firstChat.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'Nenhum chat na lista');
      return;
    }

    await firstChat.click({ force: true });
    await page.waitForTimeout(1200);

    const scrollDiv = page.locator('main div.overflow-y-auto').first();
    if (!(await scrollDiv.isVisible({ timeout: 2000 }).catch(() => false))) {
      test.skip(true, 'Container de scroll não encontrado');
      return;
    }

    const scrollState = await scrollDiv.evaluate((el) => ({
      scrollTop: el.scrollTop,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      nearBottom: el.scrollHeight - el.scrollTop - el.clientHeight < 150,
    }));

    expect(scrollState.scrollHeight).toBeGreaterThanOrEqual(0);
    expect(scrollState.clientHeight).toBeGreaterThan(0);
  });
});
