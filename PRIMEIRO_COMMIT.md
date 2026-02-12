# 🚀 Guia do Primeiro Commit e Push para GitHub

Este guia vai te ajudar a fazer o primeiro commit e push do projeto para o GitHub.

## 📋 Pré-requisitos

- ✅ Git instalado
- ✅ Conta no GitHub criada
- ✅ Repositório criado no GitHub (veja `SETUP_GITHUB.md`)

## 🔧 Passo a Passo

### 1. Verificar Status do Git

```bash
git status
```

Você deve ver todos os arquivos modificados e novos.

### 2. Adicionar Arquivos ao Stage

```bash
# Adicionar todos os arquivos
git add .

# Ou adicionar arquivos específicos
git add src/
git add .github/
git add package.json
# etc...
```

### 3. Verificar o que será commitado

```bash
git status
```

Certifique-se de que:
- ✅ Não há arquivos sensíveis (`.env.local`, `node_modules`, etc.)
- ✅ Todos os arquivos importantes estão incluídos

### 4. Fazer o Primeiro Commit

```bash
git commit -m "feat: projeto inicial com todas as correções de segurança e CI/CD

- Implementado sistema de PIN seguro
- Adicionado rate limiting
- Implementado logging seguro
- Webhook do Stripe configurado
- CI/CD com GitHub Actions
- Validação de entrada com Zod
- Tratamento de erros centralizado
- Error Boundary implementado
- Documentação completa"
```

**Ou use uma mensagem mais simples:**

```bash
git commit -m "feat: projeto inicial com correções de segurança e CI/CD"
```

### 5. Conectar ao Repositório Remoto

**Se ainda não conectou:**

```bash
# Substitua SEU_USUARIO pelo seu usuário do GitHub
git remote add origin https://github.com/SEU_USUARIO/warranty-tracker.git

# Verificar remote
git remote -v
```

**Se já conectou, pule para o próximo passo.**

### 6. Renomear Branch (se necessário)

```bash
# Verificar branch atual
git branch

# Se estiver em 'master', renomear para 'main'
git branch -M main
```

### 7. Push para GitHub

```bash
# Primeiro push (com -u para setar upstream)
git push -u origin main
```

**Se pedir autenticação:**

- **Token:** Use um Personal Access Token do GitHub
- **Como criar:** GitHub > Settings > Developer settings > Personal access tokens > Tokens (classic)
- **Permissões necessárias:** `repo` (acesso completo a repositórios)

### 8. Verificar no GitHub

1. Acesse seu repositório no GitHub
2. Você deve ver todos os arquivos
3. Vá para a aba **Actions** - os workflows devem começar a rodar

## 🧪 Testar Localmente Antes do Push

### Rodar Testes

```bash
# Verificar tipos
yarn type-check

# Verificar lint
yarn lint

# Rodar testes (se tiver)
yarn test

# Build
yarn build
```

### Script de Teste Automático

**Windows (PowerShell):**
```powershell
.\scripts\test-setup.ps1
```

**Linux/Mac:**
```bash
chmod +x scripts/test-setup.sh
./scripts/test-setup.sh
```

## ⚠️ Checklist Antes do Commit

- [ ] `.env.local` está no `.gitignore` (não será commitado)
- [ ] `node_modules` está no `.gitignore`
- [ ] Não há secrets hardcoded no código
- [ ] Todos os testes passam
- [ ] TypeScript compila sem erros
- [ ] Lint sem erros críticos

## 🔒 Segurança

### ⚠️ NUNCA commite:

- ❌ `.env.local` ou qualquer arquivo `.env` com valores reais
- ❌ Secrets, API keys, tokens
- ❌ Credenciais de banco de dados
- ❌ Chaves privadas

### ✅ Pode commitar:

- ✅ `.env.example` (sem valores reais)
- ✅ Código-fonte
- ✅ Documentação
- ✅ Configurações (sem secrets)

## 📝 Próximos Commits

Para commits futuros, siga a convenção:

```bash
# Nova funcionalidade
git commit -m "feat: adiciona sistema de notificações"

# Correção de bug
git commit -m "fix: corrige validação de email"

# Documentação
git commit -m "docs: atualiza README"

# Refatoração
git commit -m "refactor: melhora estrutura de componentes"

# Testes
git commit -m "test: adiciona testes para autenticação"
```

## 🎉 Pronto!

Seu código está no GitHub! Agora você pode:

1. Ver os workflows rodando em **Actions**
2. Criar Pull Requests
3. Colaborar com outros desenvolvedores
4. Fazer releases

## 🆘 Problemas Comuns

### Erro: "remote origin already exists"

```bash
# Remover remote existente
git remote remove origin

# Adicionar novamente
git remote add origin https://github.com/SEU_USUARIO/warranty-tracker.git
```

### Erro: "failed to push some refs"

```bash
# Se o repositório já tem conteúdo, fazer pull primeiro
git pull origin main --allow-unrelated-histories

# Depois fazer push
git push -u origin main
```

### Erro de autenticação

1. Criar Personal Access Token no GitHub
2. Usar token como senha ao fazer push
3. Ou configurar SSH keys

## 📚 Recursos

- [GitHub Docs](https://docs.github.com)
- [Git Handbook](https://guides.github.com/introduction/git-handbook/)
- [Conventional Commits](https://www.conventionalcommits.org/)
