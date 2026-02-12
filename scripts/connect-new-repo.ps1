# Script para conectar ao novo repositório Git
# Execute após criar o repositório no GitHub

param(
    [Parameter(Mandatory=$true)]
    [string]$RepoUrl
)

Write-Host "🔗 Conectando ao novo repositório..." -ForegroundColor Cyan

# Verificar se já existe um remote
$existingRemote = git remote | Select-String -Pattern "origin"
if ($existingRemote) {
    Write-Host "⚠️  Remote 'origin' já existe. Removendo..." -ForegroundColor Yellow
    git remote remove origin
}

# Adicionar novo remote
Write-Host "📝 Adicionando remote: $RepoUrl" -ForegroundColor Green
git remote add origin $RepoUrl

# Verificar
Write-Host "✅ Verificando remote..." -ForegroundColor Cyan
git remote -v

# Perguntar se quer fazer push
$push = Read-Host "Deseja fazer push agora? (S/N)"
if ($push -eq "S" -or $push -eq "s") {
    Write-Host "🚀 Fazendo push da branch staging..." -ForegroundColor Green
    git push -u origin staging
    
    Write-Host "✅ Push concluído!" -ForegroundColor Green
    Write-Host "📋 Próximos passos:" -ForegroundColor Cyan
    Write-Host "   1. Verifique o repositório no GitHub"
    Write-Host "   2. Configure as variáveis de ambiente no Vercel"
    Write-Host "   3. Faça deploy!"
}
