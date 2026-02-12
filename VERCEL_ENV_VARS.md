# 🔧 Variáveis de Ambiente para Vercel

## Variáveis Obrigatórias

Configure estas variáveis no painel do Vercel (Settings > Environment Variables):

```
NEXT_PUBLIC_SUPABASE_URL=https://moaxyoqjedgrfnxeskku.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_eaIUZoh1qAkdWVcAm9VYrg_cp0fcgsM
SUPABASE_SERVICE_ROLE_KEY=sb_secret_rvTz9mUlJsW7wn_T_1Qyww_jBaOgKXc
NODE_ENV=production
```

## Variáveis Opcionais

```
NEXT_PUBLIC_NEWS_API_KEY=sua-chave-news-api-aqui
```

## Como Configurar no Vercel

1. Acesse seu projeto no Vercel
2. Vá em **Settings** > **Environment Variables**
3. Adicione cada variável:
   - **Key**: Nome da variável (ex: `NEXT_PUBLIC_SUPABASE_URL`)
   - **Value**: Valor da variável
   - **Environment**: Selecione `Production`, `Preview`, e `Development`
4. Clique em **Save**
5. Faça um novo deploy

## ⚠️ Importante

- **NÃO** adicione variáveis do Stripe (este projeto não usa Stripe)
- Certifique-se de que o repositório GitHub está apontando para o projeto correto (`stealth-messaging`)
- Se o erro persistir, verifique se há rotas de API antigas do warranty-tracker no código
