# Automação de Testes

## 🚀 Scripts Criados

### 1. Executar Todos os Testes

#### Windows (PowerShell)
```powershell
.\scripts\test-all.ps1
```

#### Linux/macOS (Bash)
```bash
chmod +x scripts/test-all.sh
./scripts/test-all.sh
```

#### Node.js (Multiplataforma)
```bash
yarn test:all
```

### 2. Testes Individuais

```bash
# Testes básicos
yarn test:basic

# Testes do Dashboard
yarn test:dashboard

# Testes de UI
yarn test:ui-components

# Testes de Integração
yarn test:integration

# Testes de Performance
yarn test:performance

# Testes de Segurança
yarn test:security

# Testes de Acessibilidade
yarn test:accessibility
```

### 3. Commit e Push Automático

#### Windows (PowerShell)
```powershell
.\scripts\commit-and-push.ps1 "feat: adiciona novas funcionalidades"
```

#### Linux/macOS (Bash)
```bash
chmod +x scripts/commit-and-push.sh
./scripts/commit-and-push.sh "feat: adiciona novas funcionalidades"
```

## 🤖 GitHub Actions

### Workflows Configurados

1. **CI** (`.github/workflows/ci.yml`)
   - Roda em: push/PR para main, develop, staging
   - Executa: lint, type-check, build, security audit

2. **Playwright Tests** (`.github/workflows/playwright.yml`)
   - Roda em: push/PR para main, develop, staging
   - Executa: todos os testes Playwright
   - Upload: relatório HTML

3. **Test All** (`.github/workflows/test-all.yml`) - NOVO
   - Roda em: push/PR + execução manual + agendado (diário às 2h UTC)
   - Executa: todos os tipos de teste separadamente
   - Upload: relatório detalhado

### Execução Manual

No GitHub, vá para:
1. **Actions** > **Test All**
2. Clique em **Run workflow**
3. Selecione branch e clique em **Run workflow**

## 📋 O que os Scripts Fazem

### `test-all.js` / `test-all.sh` / `test-all.ps1`

1. ✅ Verifica tipos TypeScript (`yarn type-check`)
2. ✅ Executa linter (`yarn lint`)
3. ✅ Verifica formatação (`yarn format:check`)
4. ✅ Executa todos os testes Playwright:
   - Testes básicos
   - Testes do Dashboard
   - Testes de UI
   - Testes de Integração
   - Testes de Performance
   - Testes de Segurança
   - Testes de Acessibilidade
5. ✅ Executa todos os testes juntos
6. ✅ Mostra resumo e instruções para ver relatório

### `commit-and-push.sh` / `commit-and-push.ps1`

1. ✅ Verifica se há mudanças
2. ✅ Mostra status das mudanças
3. ✅ Adiciona todos os arquivos (`git add .`)
4. ✅ Faz commit com mensagem fornecida
5. ✅ Faz push para branch atual

## 🎯 Uso Recomendado

### Desenvolvimento Local

```bash
# Antes de commitar
yarn test:all

# Se tudo passar, commitar
git add .
git commit -m "feat: nova funcionalidade"
git push origin staging
```

### CI/CD Automático

Os workflows do GitHub Actions rodam automaticamente quando:
- Você faz push para `main`, `develop` ou `staging`
- Você abre um Pull Request
- Você executa manualmente no GitHub
- Agendamento diário (apenas `test-all.yml`)

## 🔧 Configuração

### Variáveis de Ambiente Necessárias

No GitHub Secrets (Settings > Secrets and variables > Actions):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `STRIPE_SECRET_KEY` (opcional, para build)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (opcional, para build)

### Permissões de Scripts

#### Linux/macOS
```bash
chmod +x scripts/*.sh
```

#### Windows
Os scripts `.ps1` já têm permissões adequadas.

## 📊 Relatórios

### Local
```bash
# Ver relatório HTML após testes
yarn playwright show-report
```

### GitHub Actions
1. Vá para **Actions**
2. Clique no workflow executado
3. Baixe o artifact `playwright-report`
4. Abra `index.html` no navegador

## 🐛 Troubleshooting

### Erro: "Script não encontrado"
- Verifique se está no diretório raiz do projeto
- Use caminho completo: `.\scripts\test-all.ps1`

### Erro: "Permissão negada" (Linux/macOS)
```bash
chmod +x scripts/test-all.sh
chmod +x scripts/commit-and-push.sh
```

### Erro no GitHub Actions
- Verifique se os secrets estão configurados
- Veja os logs do workflow para detalhes
- Teste localmente primeiro com `yarn test:all`

### Testes falhando no CI mas passando localmente
- Verifique variáveis de ambiente
- Verifique se o servidor está rodando (`yarn dev`)
- Use `yarn test:headed` para ver o que está acontecendo

## 📝 Próximos Passos

1. ✅ Scripts de automação criados
2. ✅ GitHub Actions configurado
3. ✅ Workflows para todas as branches
4. ⏳ Pre-commit hooks (opcional)
5. ⏳ Notificações Slack/Email (opcional)
