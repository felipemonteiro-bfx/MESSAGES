import { test as setup } from '@playwright/test';

const authFile = 'test-results/user.json';

setup('authenticate', async ({ page }) => {
  // Nota: Em um ambiente real, faríamos o login aqui.
  // Para este teste, vamos simular que o Supabase aceita o token ou bypassar via evaluate.
  await page.goto('http://127.0.0.1:3001/login');
  
  // Vamos injetar um estado de sessão simulado no localStorage que o Supabase SSR reconheça (se possível)
  // Ou simplesmente pular para o dashboard se o ambiente permitir bypass de teste.
  
  // Como o Supabase SSR usa cookies, o melhor é fazer um login real se tivermos credenciais de teste,
  // ou configurar o Playwright para ignorar o redirect no layout apenas durante o teste.
  
  await page.context().storageState({ path: authFile });
});
