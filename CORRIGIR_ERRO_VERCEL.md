# 🔧 Corrigir Erro do Vercel - Stripe

## ❌ Erro Encontrado

O Vercel está tentando fazer build e encontra rotas de API do Stripe que não existem mais no projeto `stealth-messaging`:

```
Error: ❌ Variáveis de ambiente inválidas ou faltando:
STRIPE_SECRET_KEY: Invalid input: expected string, received undefined
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: Invalid input: expected string, received undefined
```

## ✅ Solução Aplicada

### 1. Removidas Rotas de API do Stripe
- ❌ `src/app/api/billing-portal/route.ts` - Removido
- ❌ `src/app/api/checkout/route.ts` - Removido
- ❌ `src/app/api/webhook/route.ts` - Removido
- ❌ Pasta `src/app/api/` - Removida completamente

### 2. Validação de Ambiente Corrigida
- ✅ `src/lib/env.ts` - Apenas valida Supabase e NewsAPI (sem Stripe)

## 🚀 Próximos Passos

### 1. Fazer Commit e Push
```bash
cd C:\Users\Administrador\stealth-messaging
git add .
git commit -m "fix: remover rotas Stripe que causam erro no Vercel"
git push origin main
```

### 2. Verificar Vercel
1. Acesse: https://vercel.com/dashboard
2. Selecione projeto `MESSAGES`
3. Vá em **Deployments**
4. O próximo deploy deve funcionar sem erros

### 3. Verificar Variáveis no Vercel
Certifique-se de que **APENAS** estas variáveis estão configuradas:

```env
NEXT_PUBLIC_SUPABASE_URL=https://moaxyoqjedgrfnxeskku.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_eaIUZoh1qAkdWVcAm9VYrg_cp0fcgsM
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui
NEXT_PUBLIC_NEWS_API_KEY=da189e9058564f9ab155924a751cccef
NODE_ENV=production
```

**⚠️ NÃO adicione variáveis do Stripe!**

---

## ✅ Verificação

### Arquivos Removidos
- [x] `src/app/api/billing-portal/route.ts`
- [x] `src/app/api/checkout/route.ts`
- [x] `src/app/api/webhook/route.ts`

### Validação Corrigida
- [x] `src/lib/env.ts` - Apenas Supabase e NewsAPI

### Próximo Deploy
- [ ] Commit realizado
- [ ] Push realizado
- [ ] Vercel faz deploy automático
- [ ] Build deve passar sem erros

---

## 🎯 Resultado Esperado

Após fazer commit e push, o próximo deploy no Vercel deve:
- ✅ Compilar sem erros
- ✅ Não procurar variáveis do Stripe
- ✅ Funcionar apenas com Supabase e NewsAPI

---

**Problema resolvido! Faça commit e push para aplicar a correção! 🚀**
