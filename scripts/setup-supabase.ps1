# Script de Configuração do Supabase
# Este script ajuda a configurar o Supabase passo a passo

Write-Host "🔐 Configuração do Supabase" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se .env.local existe
if (-not (Test-Path ".env.local")) {
    Write-Host "📝 Criando arquivo .env.local..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env.local"
    Write-Host "✅ Arquivo .env.local criado!" -ForegroundColor Green
    Write-Host ""
}

Write-Host "📋 PRÓXIMOS PASSOS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Crie uma conta no Supabase: https://supabase.com" -ForegroundColor White
Write-Host "2. Crie um novo projeto" -ForegroundColor White
Write-Host "3. Vá em Settings > API e copie:" -ForegroundColor White
Write-Host "   - Project URL" -ForegroundColor Gray
Write-Host "   - anon public key" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Execute os scripts SQL:" -ForegroundColor White
Write-Host "   - docs/schema.sql" -ForegroundColor Gray
Write-Host "   - docs/messaging_schema.sql" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Configure os Storage Buckets:" -ForegroundColor White
Write-Host "   - invoices (público)" -ForegroundColor Gray
Write-Host "   - chat-media (privado)" -ForegroundColor Gray
Write-Host ""
Write-Host "6. Ative Realtime nas tabelas: messages, chats, chat_participants" -ForegroundColor White
Write-Host ""
Write-Host "7. Preencha o arquivo .env.local com suas chaves" -ForegroundColor White
Write-Host ""

$continue = Read-Host "Você já tem as chaves do Supabase? (S/N)"
if ($continue -eq "S" -or $continue -eq "s") {
    Write-Host ""
    Write-Host "🔑 Configure suas chaves:" -ForegroundColor Cyan
    
    $supabaseUrl = Read-Host "NEXT_PUBLIC_SUPABASE_URL"
    $supabaseKey = Read-Host "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    
    # Ler arquivo .env.local
    $envContent = Get-Content ".env.local" -Raw
    
    # Substituir valores
    $envContent = $envContent -replace "NEXT_PUBLIC_SUPABASE_URL=.*", "NEXT_PUBLIC_SUPABASE_URL=$supabaseUrl"
    $envContent = $envContent -replace "NEXT_PUBLIC_SUPABASE_ANON_KEY=.*", "NEXT_PUBLIC_SUPABASE_ANON_KEY=$supabaseKey"
    
    # Salvar
    Set-Content ".env.local" -Value $envContent -NoNewline
    
    Write-Host ""
    Write-Host "✅ Chaves configuradas!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Próximos passos:" -ForegroundColor Cyan
    Write-Host "   1. Execute os scripts SQL no Supabase" -ForegroundColor White
    Write-Host "   2. Configure os Storage buckets" -ForegroundColor White
    Write-Host "   3. Ative o Realtime" -ForegroundColor White
    Write-Host "   4. Teste: yarn dev" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "📖 Consulte o guia completo: CONFIGURAR_SUPABASE.md" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✨ Configuração concluída!" -ForegroundColor Green
