# Script para Integrar Projeto com Vercel
# Execute: .\scripts\integrar-vercel.ps1

Write-Host "🚀 Integrando projeto com Vercel..." -ForegroundColor Cyan

# Verificar se está no diretório correto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Erro: Execute este script na raiz do projeto" -ForegroundColor Red
    exit 1
}

# Verificar se Vercel CLI está instalado
Write-Host "`n📦 Verificando Vercel CLI..." -ForegroundColor Yellow
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue

if (-not $vercelInstalled) {
    Write-Host "⚠️  Vercel CLI não encontrado. Instalando..." -ForegroundColor Yellow
    npm install -g vercel
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro ao instalar Vercel CLI" -ForegroundColor Red
        Write-Host "💡 Instale manualmente: npm install -g vercel" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "✅ Vercel CLI encontrado" -ForegroundColor Green

# Verificar se já está logado
Write-Host "`n🔐 Verificando login no Vercel..." -ForegroundColor Yellow
$vercelWhoami = vercel whoami 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Não está logado. Fazendo login..." -ForegroundColor Yellow
    Write-Host "📝 Abra o navegador e faça login quando solicitado" -ForegroundColor Cyan
    vercel login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro ao fazer login" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Logado como: $vercelWhoami" -ForegroundColor Green
}

# Verificar se projeto já existe
Write-Host "`n🔍 Verificando projeto no Vercel..." -ForegroundColor Yellow
$projectExists = vercel ls 2>&1 | Select-String "stealth-messaging|MESSAGES"

if ($projectExists) {
    Write-Host "✅ Projeto já existe no Vercel" -ForegroundColor Green
    Write-Host "💡 Para fazer deploy: vercel --prod" -ForegroundColor Cyan
} else {
    Write-Host "📝 Criando novo projeto..." -ForegroundColor Yellow
    Write-Host "💡 Siga as instruções na tela:" -ForegroundColor Cyan
    Write-Host "   - Escolha 'Link to existing project'" -ForegroundColor Gray
    Write-Host "   - Selecione o repositório GitHub" -ForegroundColor Gray
    Write-Host "   - Configure as variáveis de ambiente" -ForegroundColor Gray
}

# Linkar projeto (se necessário)
Write-Host "`n🔗 Linkando projeto..." -ForegroundColor Yellow
vercel link

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Projeto linkado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Link manual pode ser necessário" -ForegroundColor Yellow
}

# Informar sobre variáveis de ambiente
Write-Host "`n📋 Variáveis de Ambiente Necessárias:" -ForegroundColor Cyan
Write-Host ""
Write-Host "NEXT_PUBLIC_SUPABASE_URL=https://moaxyoqjedgrfnxeskku.supabase.co" -ForegroundColor White
Write-Host "NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_eaIUZoh1qAkdWVcAm9VYrg_cp0fcgsM" -ForegroundColor White
Write-Host "SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui" -ForegroundColor White
Write-Host "NEXT_PUBLIC_NEWS_API_KEY=da189e9058564f9ab155924a751cccef" -ForegroundColor White
Write-Host "NODE_ENV=production" -ForegroundColor White
Write-Host ""
Write-Host "💡 Configure essas variáveis em:" -ForegroundColor Yellow
Write-Host "   https://vercel.com/dashboard -> Seu Projeto -> Settings -> Environment Variables" -ForegroundColor Cyan

# Perguntar se quer fazer deploy
Write-Host "`n🚀 Deseja fazer deploy agora? (S/N)" -ForegroundColor Yellow
$deploy = Read-Host

if ($deploy -eq "S" -or $deploy -eq "s" -or $deploy -eq "Y" -or $deploy -eq "y") {
    Write-Host "`n📦 Fazendo deploy..." -ForegroundColor Yellow
    vercel --prod
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Deploy realizado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "`n⚠️  Deploy pode ter falhado. Verifique os logs acima." -ForegroundColor Yellow
    }
} else {
    Write-Host "`n💡 Para fazer deploy depois, execute: vercel --prod" -ForegroundColor Cyan
}

Write-Host "`n✅ Integração concluída!" -ForegroundColor Green
