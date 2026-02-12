#!/bin/bash
# Script de Configuração do Supabase
# Este script ajuda a configurar o Supabase passo a passo

echo "🔐 Configuração do Supabase"
echo "================================"
echo ""

# Verificar se .env.local existe
if [ ! -f ".env.local" ]; then
    echo "📝 Criando arquivo .env.local..."
    cp .env.example .env.local
    echo "✅ Arquivo .env.local criado!"
    echo ""
fi

echo "📋 PRÓXIMOS PASSOS:"
echo ""
echo "1. Crie uma conta no Supabase: https://supabase.com"
echo "2. Crie um novo projeto"
echo "3. Vá em Settings > API e copie:"
echo "   - Project URL"
echo "   - anon public key"
echo ""
echo "4. Execute os scripts SQL:"
echo "   - docs/schema.sql"
echo "   - docs/messaging_schema.sql"
echo ""
echo "5. Configure os Storage Buckets:"
echo "   - invoices (público)"
echo "   - chat-media (privado)"
echo ""
echo "6. Ative Realtime nas tabelas: messages, chats, chat_participants"
echo ""
echo "7. Preencha o arquivo .env.local com suas chaves"
echo ""

read -p "Você já tem as chaves do Supabase? (S/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo ""
    echo "🔑 Configure suas chaves:"
    
    read -p "NEXT_PUBLIC_SUPABASE_URL: " supabaseUrl
    read -p "NEXT_PUBLIC_SUPABASE_ANON_KEY: " supabaseKey
    
    # Atualizar .env.local
    sed -i.bak "s|NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=$supabaseUrl|" .env.local
    sed -i.bak "s|NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=$supabaseKey|" .env.local
    
    echo ""
    echo "✅ Chaves configuradas!"
    echo ""
    echo "📋 Próximos passos:"
    echo "   1. Execute os scripts SQL no Supabase"
    echo "   2. Configure os Storage buckets"
    echo "   3. Ative o Realtime"
    echo "   4. Teste: yarn dev"
else
    echo ""
    echo "📖 Consulte o guia completo: CONFIGURAR_SUPABASE.md"
fi

echo ""
echo "✨ Configuração concluída!"
