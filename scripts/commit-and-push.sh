#!/bin/bash

# Script para fazer commit e push automático
# Uso: ./scripts/commit-and-push.sh "mensagem do commit"

MESSAGE="${1:-chore: atualizações automáticas}"

echo "📦 Preparando commit e push..."
echo ""

# Verificar se há mudanças
if [ -z "$(git status --porcelain)" ]; then
    echo "ℹ️  Nenhuma mudança para commitar"
    exit 0
fi

# Mostrar status
echo "📋 Mudanças detectadas:"
git status --short
echo ""

# Adicionar todos os arquivos
echo "➕ Adicionando arquivos..."
git add .
echo "✅ Arquivos adicionados"

# Commit
echo ""
echo "💾 Fazendo commit..."
git commit -m "$MESSAGE"
if [ $? -ne 0 ]; then
    echo "❌ Erro ao fazer commit"
    exit 1
fi
echo "✅ Commit realizado"

# Push
echo ""
echo "🚀 Fazendo push..."
BRANCH=$(git rev-parse --abbrev-ref HEAD)
git push origin "$BRANCH"
if [ $? -ne 0 ]; then
    echo "❌ Erro ao fazer push"
    echo "💡 Tente: git push origin $BRANCH --force (se necessário)"
    exit 1
fi
echo "✅ Push realizado com sucesso!"
echo ""
echo "🔗 Branch: $BRANCH"
