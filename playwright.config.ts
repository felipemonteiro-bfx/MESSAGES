import { config } from 'dotenv';
import { defineConfig, devices } from '@playwright/test';

// Carregar variáveis de ambiente (prioridade: .env.test > .env.local > .env)
config({ path: '.env.test' });
config({ path: '.env.local' });
config({ path: '.env' });

/**
 * Configuração do Playwright para testes E2E
 *
 * Variáveis de ambiente (via .env.local ou .env.test):
 * - NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY (obrigatórias para Supabase)
 * - SUPABASE_SERVICE_ROLE_KEY (para API routes)
 * - NEXT_PUBLIC_NEWS_API_KEY (opcional, notícias)
 * - PLAYWRIGHT_BASE_URL (opcional, default: http://localhost:3005)
 *
 * Para executar:
 * - npm run test:e2e:install (primeira vez - instalar browsers)
 * - npm run test:e2e (executar testes)
 * - npm run test:e2e:ui (interface gráfica)
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  // Timeout para cada teste (aumentado para fluxos longos)
  timeout: 60 * 1000,
  
  // Expect timeout
  expect: {
    timeout: 5000,
  },
  
  // Executar testes em paralelo
  fullyParallel: true,
  
  // Falhar build se houver testes falhando
  forbidOnly: !!process.env.CI,
  
  // Não executar testes em CI por padrão (pode ser habilitado depois)
  retries: 2,
  
  // Workers: 1 em CI, 2 localmente para reduzir carga no dev server
  workers: process.env.CI ? 1 : 2,
  
  // Reporter
  reporter: 'html',
  
  // Configurações compartilhadas
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3005',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  // Configurar projetos para diferentes navegadores
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Servidor de desenvolvimento (desabilitado em CI - usar servidor externo)
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3005',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
