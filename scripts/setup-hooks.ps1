# Script PowerShell para configurar git hooks
# Uso: .\scripts\setup-hooks.ps1

Write-Host "🔧 Configurando git hooks..." -ForegroundColor Cyan

# Verifica se husky está instalado
$huskyInstalled = yarn list --pattern husky --depth=0 2>&1 | Select-String -Pattern "husky"
if (-not $huskyInstalled) {
    Write-Host "📦 Instalando Husky..." -ForegroundColor Yellow
    yarn add -D husky
}

# Inicializa Husky
Write-Host "🔨 Inicializando Husky..." -ForegroundColor Yellow
yarn husky install

# Cria diretório .husky se não existir
if (-not (Test-Path .husky)) {
    New-Item -ItemType Directory -Path .husky | Out-Null
}

Write-Host "✅ Git hooks configurados!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Hooks criados:" -ForegroundColor Cyan
Write-Host "   - .husky/pre-commit  (verifica tipos e lint antes de commitar)" -ForegroundColor White
Write-Host "   - .husky/pre-push    (verifica tipos, lint e testes antes de fazer push)" -ForegroundColor White
Write-Host ""
Write-Host "💡 Para desabilitar temporariamente:" -ForegroundColor Yellow
Write-Host "   git commit --no-verify" -ForegroundColor White
Write-Host "   git push --no-verify" -ForegroundColor White
