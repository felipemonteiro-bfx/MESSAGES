# Script para Configurar Vercel Automaticamente
# Execute: .\scripts\setup-vercel.ps1

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  CONFIGURAÇÃO AUTOMÁTICA VERCEL" -ForegroundColor Cyan
Write-Host "  Stealth Messaging" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Verificar se está no diretório correto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Erro: Execute este script na raiz do projeto" -ForegroundColor Red
    exit 1
}

# Verificar Vercel CLI
Write-Host "📦 Verificando Vercel CLI..." -ForegroundColor Yellow
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue

if (-not $vercelInstalled) {
    Write-Host "⚠️  Instalando Vercel CLI..." -ForegroundColor Yellow
    npm install -g vercel
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro ao instalar Vercel CLI" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Vercel CLI encontrado`n" -ForegroundColor Green

# Verificar login
Write-Host "🔐 Verificando autenticação..." -ForegroundColor Yellow
$whoami = vercel whoami 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Não está logado no Vercel" -ForegroundColor Yellow
    Write-Host "`n📝 Para fazer login:" -ForegroundColor Cyan
    Write-Host "   1. Execute: vercel login" -ForegroundColor White
    Write-Host "   2. Abra o link no navegador" -ForegroundColor White
    Write-Host "   3. Faça login e autorize" -ForegroundColor White
    Write-Host "   4. Execute este script novamente`n" -ForegroundColor White
    exit 1
}

Write-Host "✅ Logado como: $whoami`n" -ForegroundColor Green

# Verificar se projeto já está linkado
if (Test-Path ".vercel/project.json") {
    Write-Host "✅ Projeto já está linkado ao Vercel`n" -ForegroundColor Green
    $projectInfo = Get-Content ".vercel/project.json" | ConvertFrom-Json
    Write-Host "📋 Informações do Projeto:" -ForegroundColor Cyan
    Write-Host "   Projeto: $($projectInfo.projectId)" -ForegroundColor White
    Write-Host "   Org: $($projectInfo.orgId)`n" -ForegroundColor White
} else {
    Write-Host "🔗 Linkando projeto ao Vercel..." -ForegroundColor Yellow
    Write-Host "`n💡 Siga as instruções:" -ForegroundColor Cyan
    Write-Host "   - Escolha: Link to existing project" -ForegroundColor White
    Write-Host "   - Selecione: felipemonteiro-bfx/MESSAGES" -ForegroundColor White
    Write-Host "   - Ou crie um novo projeto`n" -ForegroundColor White
    
    vercel link
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n❌ Erro ao linkar projeto" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "`n✅ Projeto linkado com sucesso!`n" -ForegroundColor Green
}

# Informar sobre variáveis de ambiente
Write-Host "📋 Variáveis de Ambiente Necessárias:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Configure estas variáveis no Vercel Dashboard:" -ForegroundColor Yellow
Write-Host ""
Write-Host "NEXT_PUBLIC_SUPABASE_URL=https://moaxyoqjedgrfnxeskku.supabase.co" -ForegroundColor White
Write-Host "NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_eaIUZoh1qAkdWVcAm9VYrg_cp0fcgsM" -ForegroundColor White
Write-Host "SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui" -ForegroundColor White
Write-Host "NEXT_PUBLIC_NEWS_API_KEY=da189e9058564f9ab155924a751cccef" -ForegroundColor White
Write-Host "NODE_ENV=production" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Configure em:" -ForegroundColor Yellow
Write-Host "   https://vercel.com/dashboard -> Seu Projeto -> Settings -> Environment Variables`n" -ForegroundColor Cyan

# Perguntar se quer fazer deploy
Write-Host "🚀 Deseja fazer deploy agora? (S/N)" -ForegroundColor Yellow
$deploy = Read-Host

if ($deploy -eq "S" -or $deploy -eq "s" -or $deploy -eq "Y" -or $deploy -eq "y") {
    Write-Host "`n📦 Fazendo deploy para produção..." -ForegroundColor Yellow
    Write-Host "⏳ Isso pode levar alguns minutos...`n" -ForegroundColor Gray
    
    vercel --prod --yes
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Deploy realizado com sucesso!`n" -ForegroundColor Green
        Write-Host "🌐 Seu app está online!" -ForegroundColor Cyan
        Write-Host "💡 Verifique o link no output acima`n" -ForegroundColor Yellow
    } else {
        Write-Host "`n⚠️  Deploy pode ter falhado. Verifique os logs acima." -ForegroundColor Yellow
        Write-Host "💡 Configure as variáveis de ambiente primeiro e tente novamente`n" -ForegroundColor Cyan
    }
} else {
    Write-Host "`n💡 Para fazer deploy depois, execute:" -ForegroundColor Cyan
    Write-Host "   vercel --prod`n" -ForegroundColor White
}

Write-Host "✅ Configuração concluída!`n" -ForegroundColor Green
