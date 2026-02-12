#!/bin/bash

# Script de teste de setup
# Verifica se tudo está configurado corretamente

echo "🧪 Testando configuração do projeto..."
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

# Verificar Node.js
echo "📦 Verificando Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✅ Node.js instalado: $NODE_VERSION${NC}"
else
    echo -e "${RED}❌ Node.js não encontrado${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Verificar Yarn
echo "📦 Verificando Yarn..."
if command -v yarn &> /dev/null; then
    YARN_VERSION=$(yarn -v)
    echo -e "${GREEN}✅ Yarn instalado: $YARN_VERSION${NC}"
else
    echo -e "${RED}❌ Yarn não encontrado${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Verificar dependências
echo "📦 Verificando dependências..."
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ node_modules encontrado${NC}"
else
    echo -e "${YELLOW}⚠️  node_modules não encontrado. Execute 'yarn install'${NC}"
fi

# Verificar .env.local
echo "🔐 Verificando variáveis de ambiente..."
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✅ .env.local encontrado${NC}"
    
    # Verificar variáveis obrigatórias
    source .env.local 2>/dev/null
    
    REQUIRED_VARS=(
        "NEXT_PUBLIC_SUPABASE_URL"
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        "STRIPE_SECRET_KEY"
        "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
    )
    
    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "^${var}=" .env.local 2>/dev/null; then
            echo -e "  ${GREEN}✅ $var configurada${NC}"
        else
            echo -e "  ${RED}❌ $var não encontrada${NC}"
            ERRORS=$((ERRORS + 1))
        fi
    done
else
    echo -e "${YELLOW}⚠️  .env.local não encontrado. Copie de .env.example${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Verificar TypeScript
echo "📝 Verificando TypeScript..."
if yarn tsc --noEmit &> /dev/null; then
    echo -e "${GREEN}✅ TypeScript sem erros${NC}"
else
    echo -e "${RED}❌ Erros de TypeScript encontrados${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Verificar lint
echo "🔍 Verificando lint..."
if yarn lint &> /dev/null; then
    echo -e "${GREEN}✅ Lint sem erros${NC}"
else
    echo -e "${YELLOW}⚠️  Alguns warnings de lint (não crítico)${NC}"
fi

# Resumo
echo ""
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}🎉 Tudo configurado corretamente!${NC}"
    echo ""
    echo "Próximos passos:"
    echo "  1. yarn dev          # Iniciar servidor de desenvolvimento"
    echo "  2. yarn test         # Rodar testes"
    echo "  3. yarn build        # Build de produção"
    exit 0
else
    echo -e "${RED}❌ Encontrados $ERRORS erro(s)${NC}"
    echo ""
    echo "Corrija os erros acima antes de continuar."
    exit 1
fi
