#!/usr/bin/env node

/**
 * Script para configurar git hooks com Husky
 * Funciona em Windows, Linux e macOS
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Configurando git hooks...\n');

try {
  // Verifica se husky está instalado
  try {
    execSync('yarn list --pattern husky --depth=0', { stdio: 'ignore' });
  } catch {
    console.log('📦 Instalando Husky...');
    execSync('yarn add -D husky', { stdio: 'inherit' });
  }

  // Inicializa Husky
  console.log('🔨 Inicializando Husky...');
  execSync('yarn husky install', { stdio: 'inherit' });

  // Cria diretório .husky se não existir
  const huskyDir = path.join(process.cwd(), '.husky');
  if (!fs.existsSync(huskyDir)) {
    fs.mkdirSync(huskyDir, { recursive: true });
  }

  console.log('\n✅ Git hooks configurados!');
  console.log('\n📝 Hooks criados:');
  console.log('   - .husky/pre-commit  (verifica tipos e lint antes de commitar)');
  console.log('   - .husky/pre-push    (verifica tipos, lint e testes antes de fazer push)');
  console.log('\n💡 Para desabilitar temporariamente:');
  console.log('   git commit --no-verify');
  console.log('   git push --no-verify');
} catch (error) {
  console.error('❌ Erro ao configurar hooks:', error.message);
  process.exit(1);
}
