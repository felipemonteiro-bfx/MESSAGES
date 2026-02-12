#!/usr/bin/env node

/**
 * Script para rodar todos os testes automaticamente
 * Funciona em Windows, Linux e macOS
 * Uso: yarn test:all
 */

const { execSync } = require('child_process');
const os = require('os');
const path = require('path');

const isWindows = os.platform() === 'win32';

// Cores para terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, options = {}) {
  try {
    execSync(command, { 
      stdio: 'inherit', 
      encoding: 'utf8',
      ...options 
    });
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

async function runTests() {
  log('🧪 Iniciando execução de todos os testes...', 'cyan');
  console.log('');

  // 1. Type Check
  log('📝 Verificando tipos TypeScript...', 'yellow');
  const typeCheck = exec('yarn type-check');
  if (!typeCheck.success) {
    log('❌ Type check falhou', 'red');
    process.exit(1);
  }
  log('✅ Type check concluído', 'green');

  // 2. Linter
  console.log('');
  log('🔍 Executando linter...', 'yellow');
  const lint = exec('yarn lint');
  if (!lint.success) {
    log('⚠️  Linter encontrou problemas (continuando...)', 'yellow');
  }

  // 3. Format Check
  console.log('');
  log('💅 Verificando formatação...', 'yellow');
  const formatCheck = exec('yarn format:check');
  if (!formatCheck.success) {
    log('⚠️  Formatação não está perfeita (continuando...)', 'yellow');
  }

  // 4. Playwright Tests
  console.log('');
  log('🎭 Executando testes Playwright...', 'yellow');

  const testSuites = [
    { name: 'Testes básicos', file: 'tests/basic.test.ts' },
    { name: 'Testes do Dashboard', file: 'tests/dashboard.test.ts' },
    { name: 'Testes de UI', file: 'tests/ui-components.test.ts' },
    { name: 'Testes de Integração', file: 'tests/integration.test.ts' },
    { name: 'Testes de Performance', file: 'tests/performance.test.ts' },
    { name: 'Testes de Segurança', file: 'tests/security.test.ts' },
    { name: 'Testes de Acessibilidade', file: 'tests/accessibility.test.ts' },
  ];

  for (const suite of testSuites) {
    console.log('');
    log(`   - ${suite.name}`, 'cyan');
    const result = exec(`yarn playwright test ${suite.file} --reporter=list`);
    if (!result.success) {
      log(`❌ ${suite.name} falhou`, 'red');
      process.exit(1);
    }
  }

  // 5. Todos os testes juntos
  console.log('');
  log('🚀 Executando todos os testes juntos...', 'yellow');
  const allTests = exec('yarn playwright test --reporter=list');
  if (!allTests.success) {
    log('❌ Alguns testes falharam', 'red');
    process.exit(1);
  }

  console.log('');
  log('🎉 Todos os testes foram executados com sucesso!', 'green');
  console.log('');
  log('📊 Para ver relatório detalhado:', 'cyan');
  log('   yarn playwright show-report', 'reset');
}

// Executar
runTests().catch((error) => {
  log(`❌ Erro ao executar testes: ${error.message}`, 'red');
  process.exit(1);
});
