# 🔧 Como Corrigir o Erro no Vercel

## Problema

O repositório GitHub `felipemonteiro-bfx/MESSAGES` ainda está apontando para o código do **warranty-tracker**, que tem rotas de API do Stripe que requerem variáveis de ambiente que não existem no projeto **stealth-messaging**.

## Solução

### Opção 1: Criar Novo Repositório (Recomendado)

1. **Criar novo repositório no GitHub:**
   - Nome: `stealth-messaging` ou `messages-stealth`
   - Público ou Privado (sua escolha)

2. **Inicializar Git no projeto local:**
   ```bash
   cd C:\Users\Administrador\stealth-messaging
   git init
   git add .
   git commit -m "Initial commit: Stealth Messaging System"
   git branch -M main
   git remote add origin https://github.com/seu-usuario/stealth-messaging.git
   git push -u origin main
   ```

3. **Conectar no Vercel:**
   - Vá em Vercel Dashboard
   - Clique em "Add New Project"
   - Importe o novo repositório `stealth-messaging`
   - Configure as variáveis de ambiente (veja abaixo)

### Opção 2: Atualizar Repositório Existente

Se você quiser usar o repositório `MESSAGES` existente:

1. **Fazer backup do código atual:**
   ```bash
   cd C:\Users\Administrador\warranty-tracker
   git checkout -b backup-warranty-tracker
   git push origin backup-warranty-tracker
   ```

2. **Substituir código no repositório MESSAGES:**
   ```bash
   cd C:\Users\Administrador\stealth-messaging
   git init
   git add .
   git commit -m "Replace with stealth-messaging code"
   git remote add origin https://github.com/felipemonteiro-bfx/MESSAGES.git
   git push -u origin main --force
   ```

## Variáveis de Ambiente no Vercel

Configure estas variáveis no Vercel (Settings > Environment Variables):

### Obrigatórias:
```
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-aqui
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui
NODE_ENV=production
```

### Opcionais:
```
NEXT_PUBLIC_NEWS_API_KEY=sua-chave-news-api-aqui
```

## ⚠️ Importante

- **NÃO** adicione variáveis do Stripe (este projeto não usa Stripe)
- O projeto stealth-messaging **NÃO** tem rotas de API do Stripe
- Se o erro persistir, verifique se há arquivos antigos do warranty-tracker no repositório

## Verificação

Após fazer o push, verifique que:
- ✅ Não há pasta `src/app/api/checkout`
- ✅ Não há pasta `src/app/api/billing-portal`
- ✅ Não há pasta `src/app/api/webhook`
- ✅ O arquivo `src/lib/env.ts` não valida variáveis do Stripe
