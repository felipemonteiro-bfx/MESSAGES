# 🚀 Deploy no Vercel - Guia Completo

## 📋 Visão Geral

Este guia explica como fazer deploy do sistema de mensagens stealth no Vercel, incluindo todas as configurações necessárias.

## ✅ Pré-requisitos

1. Conta no [Vercel](https://vercel.com) (gratuita)
2. Conta no [Supabase](https://supabase.com) (gratuita)
3. Repositório Git (GitHub, GitLab ou Bitbucket)
4. Chaves de API configuradas

## 🔧 Passo a Passo

### 1. Preparar o Repositório

Certifique-se de que seu código está em um repositório Git:

```bash
git add .
git commit -m "Sistema stealth de mensagens completo"
git push origin main
```

### 2. Conectar ao Vercel

1. Acesse [vercel.com](https://vercel.com)
2. Clique em **"Add New Project"**
3. Conecte seu repositório Git
4. Selecione o repositório `warranty-tracker`

### 3. Configurar Variáveis de Ambiente

No Vercel, vá em **Settings > Environment Variables** e adicione:

#### Variáveis Obrigatórias

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

#### Variáveis Opcionais (mas recomendadas)

```env
# Stripe (se usar pagamentos)
STRIPE_SECRET_KEY=sk_live_sua-chave-aqui
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_sua-chave-aqui
STRIPE_WEBHOOK_SECRET=whsec_sua-chave-aqui

# News API (para notícias reais)
NEXT_PUBLIC_NEWS_API_KEY=sua-chave-newsapi-aqui

# Google Gemini (se usar IA)
NEXT_PUBLIC_GEMINI_API_KEY=sua-chave-gemini-aqui

# Ambiente
NODE_ENV=production
```

### 4. Configurar Build Settings

O Vercel detecta automaticamente Next.js, mas você pode verificar:

- **Framework Preset**: Next.js
- **Build Command**: `yarn build` (ou `npm run build`)
- **Output Directory**: `.next`
- **Install Command**: `yarn install` (ou `npm install`)

### 5. Configurar Domínio (Opcional)

1. Vá em **Settings > Domains**
2. Adicione seu domínio personalizado
3. Configure os registros DNS conforme instruções

### 6. Deploy

1. Clique em **"Deploy"**
2. Aguarde o build completar (2-5 minutos)
3. Seu site estará disponível em `seu-projeto.vercel.app`

## 🔐 Configurações de Segurança

### Supabase RLS (Row Level Security)

Certifique-se de que as políticas RLS estão configuradas:

```sql
-- Exemplo de política para mensagens
CREATE POLICY "Users can view messages in their chats"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.chat_id = messages.chat_id
    AND cp.user_id = auth.uid()
  )
);
```

### CORS no Supabase

Configure CORS no Supabase para permitir seu domínio Vercel:

1. Vá em **Settings > API**
2. Adicione seu domínio Vercel em **Allowed CORS Origins**
3. Exemplo: `https://seu-projeto.vercel.app`

### Storage Policies

Configure políticas de acesso para o bucket `chat-media`:

```sql
-- Política para upload
CREATE POLICY "Users can upload to their chat media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-media'
  AND auth.role() = 'authenticated'
);

-- Política para leitura
CREATE POLICY "Users can read chat media"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-media'
  AND auth.role() = 'authenticated'
);
```

## 📱 Configurações Mobile (PWA)

Para funcionar como app no iPhone Safari:

1. Adicione `manifest.json` em `public/`
2. Configure service worker (já incluído no Next.js)
3. Adicione meta tags no `layout.tsx`:

```tsx
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```

## 🔄 Deploy Automático

O Vercel faz deploy automático a cada push:

1. **Push para `main`**: Deploy em produção
2. **Push para outras branches**: Preview deployments
3. **Pull Requests**: Deploy de preview automático

## 🐛 Troubleshooting

### Build Falha

**Erro**: `Module not found`
- **Solução**: Verifique se todas as dependências estão em `package.json`

**Erro**: `Environment variable not found`
- **Solução**: Adicione todas as variáveis no Vercel Dashboard

### Runtime Errors

**Erro**: `Supabase connection failed`
- **Solução**: Verifique CORS e URLs no Supabase

**Erro**: `Storage upload failed`
- **Solução**: Verifique políticas RLS e permissões do bucket

### Performance

**Problema**: Build muito lento
- **Solução**: Use `.vercelignore` para excluir arquivos desnecessários

**Problema**: Site lento
- **Solução**: Habilite Edge Functions no Vercel para melhor performance

## 📊 Monitoramento

### Vercel Analytics

1. Habilite Analytics no dashboard
2. Monitore performance e erros
3. Configure alertas

### Logs

Acesse logs em tempo real:
- **Vercel Dashboard > Deployments > [Seu Deploy] > Logs**
- Ou use CLI: `vercel logs`

## 🚀 Otimizações

### 1. Edge Functions

Para melhor performance global, use Edge Functions:

```typescript
// api/hello/route.ts
export const runtime = 'edge';

export async function GET() {
  return Response.json({ message: 'Hello from Edge!' });
}
```

### 2. Image Optimization

Next.js otimiza imagens automaticamente no Vercel:

```tsx
import Image from 'next/image';

<Image src="/image.jpg" width={800} height={600} alt="Description" />
```

### 3. Caching

Configure headers de cache:

```typescript
// next.config.ts
export default {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
    ];
  },
};
```

## 🔄 CI/CD com GitHub Actions

Para deploy automático com testes:

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: yarn install
      - run: yarn test
      - run: yarn build
```

## 📝 Checklist de Deploy

- [ ] Código commitado e pushed
- [ ] Variáveis de ambiente configuradas no Vercel
- [ ] Supabase CORS configurado
- [ ] Storage policies configuradas
- [ ] RLS policies ativas
- [ ] Domínio configurado (opcional)
- [ ] Testes passando
- [ ] Build bem-sucedido
- [ ] Site funcionando em produção

## 🎯 Próximos Passos

1. **Monitorar Performance**: Use Vercel Analytics
2. **Configurar Backups**: Configure backups do Supabase
3. **Otimizar Imagens**: Use Next.js Image Optimization
4. **Configurar CDN**: Vercel já inclui CDN global
5. **Habilitar HTTPS**: Automático no Vercel

## 📞 Suporte

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Supabase Docs**: https://supabase.com/docs

---

**Deploy realizado com sucesso! 🎉**
