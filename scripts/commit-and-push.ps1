# Script para fazer commit e push automático
# Uso: .\scripts\commit-and-push.ps1 "mensagem do commit"

param(
    [Parameter(Mandatory=$false)]
    [string]$Message = "chore: atualizações automáticas"
)

$ErrorActionPreference = "Stop"

Write-Host "📦 Preparando commit e push..." -ForegroundColor Cyan
Write-Host ""

# Verificar se há mudanças
$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "ℹ️  Nenhuma mudança para commitar" -ForegroundColor Yellow
    exit 0
}

# Mostrar status
Write-Host "📋 Mudanças detectadas:" -ForegroundColor Yellow
git status --short
Write-Host ""

# Adicionar todos os arquivos
Write-Host "➕ Adicionando arquivos..." -ForegroundColor Yellow
git add .
Write-Host "✅ Arquivos adicionados" -ForegroundColor Green

# Commit
Write-Host ""
Write-Host "💾 Fazendo commit..." -ForegroundColor Yellow
git commit -m $Message
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao fazer commit" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Commit realizado" -ForegroundColor Green

# Push
Write-Host ""
Write-Host "🚀 Fazendo push..." -ForegroundColor Yellow
$branch = git rev-parse --abbrev-ref HEAD
git push origin $branch
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao fazer push" -ForegroundColor Red
    Write-Host "💡 Tente: git push origin $branch --force (se necessário)" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Push realizado com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "🔗 Branch: $branch" -ForegroundColor Cyan
