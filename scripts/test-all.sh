#!/bin/bash

# Script para rodar todos os testes automaticamente
# Uso: ./scripts/test-all.sh ou yarn test:all

set -e  # Para na primeira falha

echo "🧪 Iniciando execução de todos os testes..."
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para exibir resultados
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
        exit 1
    fi
}

# 1. Verificar tipos TypeScript
echo "📝 Verificando tipos TypeScript..."
yarn type-check
print_result $? "Type check concluído"

# 2. Linter
echo ""
echo "🔍 Executando linter..."
yarn lint || echo -e "${YELLOW}⚠️  Linter encontrou problemas (continuando...)${NC}"

# 3. Formatação
echo ""
echo "💅 Verificando formatação..."
yarn format:check || echo -e "${YELLOW}⚠️  Formatação não está perfeita (continuando...)${NC}"

# 4. Testes Playwright
echo ""
echo "🎭 Executando testes Playwright..."
echo "   - Testes básicos"
yarn playwright test tests/basic.test.ts --reporter=list
print_result $? "Testes básicos"

echo ""
echo "   - Testes do Dashboard"
yarn playwright test tests/dashboard.test.ts --reporter=list
print_result $? "Testes do Dashboard"

echo ""
echo "   - Testes de UI"
yarn playwright test tests/ui-components.test.ts --reporter=list
print_result $? "Testes de UI"

echo ""
echo "   - Testes de Integração"
yarn playwright test tests/integration.test.ts --reporter=list
print_result $? "Testes de Integração"

echo ""
echo "   - Testes de Performance"
yarn playwright test tests/performance.test.ts --reporter=list
print_result $? "Testes de Performance"

echo ""
echo "   - Testes de Segurança"
yarn playwright test tests/security.test.ts --reporter=list
print_result $? "Testes de Segurança"

echo ""
echo "   - Testes de Acessibilidade"
yarn playwright test tests/accessibility.test.ts --reporter=list
print_result $? "Testes de Acessibilidade"

# 5. Todos os testes juntos
echo ""
echo "🚀 Executando todos os testes juntos..."
yarn playwright test --reporter=list
print_result $? "Todos os testes"

echo ""
echo -e "${GREEN}🎉 Todos os testes foram executados com sucesso!${NC}"
echo ""
echo "📊 Para ver relatório detalhado:"
echo "   yarn playwright show-report"
