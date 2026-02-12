# 🚀 Guia de Setup no GitHub

Este guia vai te ajudar a configurar o projeto no GitHub e habilitar CI/CD.

## 📋 Passo a Passo

### 1. Criar Repositório no GitHub

1. Acesse [GitHub](https://github.com)
2. Clique em **New repository**
3. Nome: `warranty-tracker` (ou outro de sua preferência)
4. Descrição: "Plataforma de gestão de garantias e proteção patrimonial"
5. Escolha **Public** ou **Private**
6. **NÃO** inicialize com README, .gitignore ou license (já temos)
7. Clique em **Create repository**

### 2. Conectar Repositório Local

```bash
# Se ainda não inicializou git
git init

# Adicionar todos os arquivos
git add .

# Primeiro commit
git commit -m "feat: projeto inicial com todas as correções de segurança"

# Adicionar remote do GitHub (substitua SEU_USUARIO)
git remote add origin https://github.com/SEU_USUARIO/warranty-tracker.git

# Renomear branch principal para main (se necessário)
git branch -M main

# Push inicial
git push -u origin main
```

### 3. Configurar Secrets no GitHub

Para que o CI/CD funcione, você precisa configurar secrets:

1. Vá para **Settings** > **Secrets and variables** > **Actions**
2. Clique em **New repository secret**
3. Adicione os seguintes secrets:

   - `NEXT_PUBLIC_SUPABASE_URL` - URL do Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Chave anônima do Supabase
   - `STRIPE_SECRET_KEY` - Chave secreta do Stripe
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Chave pública do Stripe

**⚠️ Importante:** Não adicione valores de produção aqui se o repositório for público!

### 4. Verificar GitHub Actions

Após fazer push, você pode verificar se as Actions estão funcionando:

1. Vá para a aba **Actions** no GitHub
2. Você deve ver os workflows rodando automaticamente
3. O workflow `CI` roda em cada push e PR
4. O workflow `Playwright Tests` roda os testes E2E

### 5. Configurar Dependabot

O Dependabot já está configurado via `.github/dependabot.yml`. Ele vai:

- Verificar atualizações de dependências semanalmente
- Criar PRs automáticos para atualizações de segurança
- Criar PRs para outras atualizações

Para habilitar:
1. Vá para **Settings** > **Code security and analysis**
2. Habilite **Dependency graph**
3. Habilite **Dependabot alerts**
4. Habilite **Dependabot security updates**

### 6. Configurar Branch Protection (Opcional mas Recomendado)

Para proteger a branch `main`:

1. Vá para **Settings** > **Branches**
2. Clique em **Add rule**
3. Branch name pattern: `main`
4. Marque:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
     - Selecione: `test`, `build`
   - ✅ Require branches to be up to date before merging
   - ✅ Include administrators

### 7. Criar Primeira Release

```bash
# Criar tag
git tag -a v0.1.0 -m "Release v0.1.0 - Versão inicial"

# Push da tag
git push origin v0.1.0
```

Isso vai criar uma release automaticamente via GitHub Actions.

## 🧪 Testar CI/CD Localmente

### Usar Act (Opcional)

```bash
# Instalar act (ferramenta para rodar GitHub Actions localmente)
# https://github.com/nektos/act

# Rodar workflow CI
act push

# Rodar workflow de testes
act -j test
```

## 📊 Monitoramento

### GitHub Insights

Após alguns commits, você pode ver:

- **Insights** > **Pulse** - Atividade do projeto
- **Insights** > **Contributors** - Contribuidores
- **Insights** > **Traffic** - Tráfego do repositório

### Code Quality

- Use **CodeQL** para análise de segurança (já configurado via Actions)
- Use **Dependabot** para dependências vulneráveis

## 🔒 Segurança

### Secrets

- ✅ Nunca commite secrets no código
- ✅ Use GitHub Secrets para CI/CD
- ✅ Use variáveis de ambiente em produção
- ✅ Rotacione secrets regularmente

### Badges (Opcional)

Adicione badges no README:

```markdown
![CI](https://github.com/SEU_USUARIO/warranty-tracker/workflows/CI/badge.svg)
![Tests](https://github.com/SEU_USUARIO/warranty-tracker/workflows/Playwright%20Tests/badge.svg)
```

## ✅ Checklist

- [ ] Repositório criado no GitHub
- [ ] Código enviado (push)
- [ ] Secrets configurados
- [ ] GitHub Actions funcionando
- [ ] Dependabot habilitado
- [ ] Branch protection configurada (opcional)
- [ ] Primeira release criada

## 🎉 Pronto!

Seu projeto está configurado no GitHub com CI/CD completo! 🚀
