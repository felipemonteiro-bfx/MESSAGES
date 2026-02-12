#!/bin/bash
# Script para conectar ao novo repositório Git
# Execute após criar o repositório no GitHub

if [ -z "$1" ]; then
    echo "❌ Erro: URL do repositório não fornecida"
    echo "Uso: ./connect-new-repo.sh https://github.com/USUARIO/REPO.git"
    exit 1
fi

REPO_URL=$1

echo "🔗 Conectando ao novo repositório..."

# Verificar se já existe um remote
if git remote | grep -q "origin"; then
    echo "⚠️  Remote 'origin' já existe. Removendo..."
    git remote remove origin
fi

# Adicionar novo remote
echo "📝 Adicionando remote: $REPO_URL"
git remote add origin "$REPO_URL"

# Verificar
echo "✅ Verificando remote..."
git remote -v

# Perguntar se quer fazer push
read -p "Deseja fazer push agora? (S/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo "🚀 Fazendo push da branch staging..."
    git push -u origin staging
    
    echo "✅ Push concluído!"
    echo "📋 Próximos passos:"
    echo "   1. Verifique o repositório no GitHub"
    echo "   2. Configure as variáveis de ambiente no Vercel"
    echo "   3. Faça deploy!"
fi
