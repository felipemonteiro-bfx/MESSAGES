# Script de teste de setup para PowerShell
# Verifica se tudo está configurado corretamente

Write-Host "🧪 Testando configuração do projeto..." -ForegroundColor Cyan
Write-Host ""

$Errors = 0

# Verificar Node.js
Write-Host "📦 Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node -v
    Write-Host "✅ Node.js instalado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js não encontrado" -ForegroundColor Red
    $Errors++
}

# Verificar Yarn
Write-Host "📦 Verificando Yarn..." -ForegroundColor Yellow
try {
    $yarnVersion = yarn -v
    Write-Host "✅ Yarn instalado: $yarnVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Yarn não encontrado" -ForegroundColor Red
    $Errors++
}

# Verificar dependências
Write-Host "📦 Verificando dependências..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "✅ node_modules encontrado" -ForegroundColor Green
} else {
    Write-Host "⚠️  node_modules não encontrado. Execute 'yarn install'" -ForegroundColor Yellow
}

# Verificar .env.local
Write-Host "🔐 Verificando variáveis de ambiente..." -ForegroundColor Yellow
if (Test-Path ".env.local") {
    Write-Host "✅ .env.local encontrado" -ForegroundColor Green
    
    $requiredVars = @(
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "STRIPE_SECRET_KEY",
        "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
    )
    
    $envContent = Get-Content ".env.local" -Raw
    
    foreach ($var in $requiredVars) {
        if ($envContent -match "$var=") {
            Write-Host "  ✅ $var configurada" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $var não encontrada" -ForegroundColor Red
            $Errors++
        }
    }
} else {
    Write-Host "⚠️  .env.local não encontrado. Copie de .env.example" -ForegroundColor Yellow
    $Errors++
}

# Verificar TypeScript
Write-Host "📝 Verificando TypeScript..." -ForegroundColor Yellow
try {
    $tscOutput = yarn tsc --noEmit 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ TypeScript sem erros" -ForegroundColor Green
    } else {
        Write-Host "❌ Erros de TypeScript encontrados" -ForegroundColor Red
        $Errors++
    }
} catch {
    Write-Host "⚠️  Não foi possível verificar TypeScript" -ForegroundColor Yellow
}

# Verificar lint
Write-Host "🔍 Verificando lint..." -ForegroundColor Yellow
try {
    $lintOutput = yarn lint 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Lint sem erros" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Alguns warnings de lint (não crítico)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Não foi possível verificar lint" -ForegroundColor Yellow
}

# Resumo
Write-Host ""
if ($Errors -eq 0) {
    Write-Host "🎉 Tudo configurado corretamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Próximos passos:" -ForegroundColor Cyan
    Write-Host "  1. yarn dev          # Iniciar servidor de desenvolvimento"
    Write-Host "  2. yarn test         # Rodar testes"
    Write-Host "  3. yarn build        # Build de produção"
    exit 0
} else {
    Write-Host "❌ Encontrados $Errors erro(s)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Corrija os erros acima antes de continuar." -ForegroundColor Yellow
    exit 1
}
