#!/bin/bash

# Script para configurar git hooks
# Uso: ./scripts/setup-hooks.sh

echo "🔧 Configurando git hooks..."

# Verifica se husky está instalado
if ! command -v husky &> /dev/null; then
  echo "📦 Instalando Husky..."
  yarn add -D husky
fi

# Inicializa Husky
echo "🔨 Inicializando Husky..."
yarn husky install

# Cria diretório .husky se não existir
mkdir -p .husky

# Dá permissão de execução aos hooks
chmod +x .husky/pre-commit
chmod +x .husky/pre-push

echo "✅ Git hooks configurados!"
echo ""
echo "📝 Hooks criados:"
echo "   - .husky/pre-commit  (verifica tipos e lint antes de commitar)"
echo "   - .husky/pre-push    (verifica tipos, lint e testes antes de fazer push)"
echo ""
echo "💡 Para desabilitar temporariamente:"
echo "   git commit --no-verify"
echo "   git push --no-verify"
