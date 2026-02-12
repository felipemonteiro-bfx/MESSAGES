# Script PowerShell para rodar todos os testes automaticamente
# Uso: .\scripts\test-all.ps1 ou yarn test:all

$ErrorActionPreference = "Stop"

Write-Host "🧪 Iniciando execução de todos os testes..." -ForegroundColor Cyan
Write-Host ""

function Print-Result {
    param(
        [int]$ExitCode,
        [string]$Message
    )
    
    if ($ExitCode -eq 0) {
        Write-Host "✅ $Message" -ForegroundColor Green
    } else {
        Write-Host "❌ $Message" -ForegroundColor Red
        exit 1
    }
}

# 1. Verificar tipos TypeScript
Write-Host "📝 Verificando tipos TypeScript..." -ForegroundColor Yellow
yarn type-check
Print-Result $LASTEXITCODE "Type check concluído"

# 2. Linter
Write-Host ""
Write-Host "🔍 Executando linter..." -ForegroundColor Yellow
yarn lint
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Linter encontrou problemas (continuando...)" -ForegroundColor Yellow
}

# 3. Formatação
Write-Host ""
Write-Host "💅 Verificando formatação..." -ForegroundColor Yellow
yarn format:check
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Formatação não está perfeita (continuando...)" -ForegroundColor Yellow
}

# 4. Testes Playwright
Write-Host ""
Write-Host "🎭 Executando testes Playwright..." -ForegroundColor Yellow

Write-Host "   - Testes básicos" -ForegroundColor Cyan
yarn playwright test tests/basic.test.ts --reporter=list
Print-Result $LASTEXITCODE "Testes básicos"

Write-Host ""
Write-Host "   - Testes do Dashboard" -ForegroundColor Cyan
yarn playwright test tests/dashboard.test.ts --reporter=list
Print-Result $LASTEXITCODE "Testes do Dashboard"

Write-Host ""
Write-Host "   - Testes de UI" -ForegroundColor Cyan
yarn playwright test tests/ui-components.test.ts --reporter=list
Print-Result $LASTEXITCODE "Testes de UI"

Write-Host ""
Write-Host "   - Testes de Integração" -ForegroundColor Cyan
yarn playwright test tests/integration.test.ts --reporter=list
Print-Result $LASTEXITCODE "Testes de Integração"

Write-Host ""
Write-Host "   - Testes de Performance" -ForegroundColor Cyan
yarn playwright test tests/performance.test.ts --reporter=list
Print-Result $LASTEXITCODE "Testes de Performance"

Write-Host ""
Write-Host "   - Testes de Segurança" -ForegroundColor Cyan
yarn playwright test tests/security.test.ts --reporter=list
Print-Result $LASTEXITCODE "Testes de Segurança"

Write-Host ""
Write-Host "   - Testes de Acessibilidade" -ForegroundColor Cyan
yarn playwright test tests/accessibility.test.ts --reporter=list
Print-Result $LASTEXITCODE "Testes de Acessibilidade"

# 5. Todos os testes juntos
Write-Host ""
Write-Host "🚀 Executando todos os testes juntos..." -ForegroundColor Yellow
yarn playwright test --reporter=list
Print-Result $LASTEXITCODE "Todos os testes"

Write-Host ""
Write-Host "🎉 Todos os testes foram executados com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Para ver relatório detalhado:" -ForegroundColor Cyan
Write-Host "   yarn playwright show-report" -ForegroundColor White
