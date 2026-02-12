# 🚀 Deploy no Vercel - Guia Completo

## 📋 Pré-requisitos

- ✅ Conta no GitHub
- ✅ Código commitado e pushado para GitHub
- ✅ Conta no Vercel (gratuita)
- ✅ Supabase configurado

---

## 🎯 Passo 1: Preparar Código no GitHub

### 1. Verificar se está tudo commitado:

```bash
cd C:\Users\Administrador\stealth-messaging
git status
```

### 2. Se houver mudanças, commite:

```bash
git add .
git commit -m "Melhorias stealth: notícias, mobile, performance"
git push
```

---

## 🌐 Passo 2: Criar Conta no Vercel

### 1. Acesse: https://vercel.com/signup

### 2. Escolha "Continue with GitHub"

### 3. Autorize o Vercel a acessar seus repositórios

---

## 📦 Passo 3: Conectar Repositório

### 1. No Dashboard do Vercel:
- Clique em **"Add New Project"**
- Ou **"Import Project"**

### 2. Conecte com GitHub:
- Se não aparecer seu repositório, clique em **"Adjust GitHub App Permissions"**
- Selecione o repositório `stealth-messaging` (ou o nome do seu repo)

### 3. Configure o Projeto:

**Framework Preset:** Next.js (detectado automaticamente)  
**Root Directory:** `./` (raiz)  
**Build Command:** `yarn build` (ou deixe vazio)  
**Output Directory:** `.next` (ou deixe vazio)  
**Install Command:** `yarn install` (ou deixe vazio)

### 4. **NÃO faça deploy ainda!** Primeiro configure as variáveis.

---

## 🔐 Passo 4: Configurar Variáveis de Ambiente

### 1. No Vercel, vá em **Settings > Environment Variables**

### 2. Adicione as seguintes variáveis:

#### Obrigatórias:

```env
NEXT_PUBLIC_SUPABASE_URL=https://moaxyoqjedgrfnxeskku.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_eaIUZoh1qAkdWVcAm9VYrg_cp0fcgsM
SUPABASE_SERVICE_ROLE_KEY=sb_secret_rvTz9mUlJsW7wn_T_1Qyww_jBaOgKXc
NODE_ENV=production
```

#### Opcionais (mas recomendadas):

```env
NEXT_PUBLIC_NEWS_API_KEY=sua-chave-newsapi-aqui
```

### 3. Para cada variável:
- ✅ Marque **Production**
- ✅ Marque **Preview** (para testar em PRs)
- ✅ Marque **Development** (opcional)

### 4. Clique em **Save** para cada variável

---

## 🚀 Passo 5: Fazer Deploy

### Opção 1: Deploy Automático (Recomendado)

1. **Após configurar variáveis**, volte para **Deployments**
2. Clique em **"Deploy"** ou **"Redeploy"**
3. Aguarde o build completar (2-5 minutos)

### Opção 2: Deploy via Git Push

1. Faça um commit e push:
```bash
git add .
git commit -m "Preparar para deploy"
git push
```

2. O Vercel detecta automaticamente e faz deploy

---

## ✅ Passo 6: Verificar Deploy

### 1. Aguarde o build completar:
- ✅ Status deve mudar para "Ready"
- ✅ Deve mostrar um link (exemplo: `stealth-messaging.vercel.app`)

### 2. Clique no link para testar:
- ✅ App deve carregar
- ✅ Notícias devem aparecer
- ✅ Login deve funcionar

### 3. Verifique logs se houver erro:
- Vá em **Deployments > [seu-deploy] > Logs**
- Procure por erros em vermelho

---

## 🔗 Passo 7: Configurar Domínio Customizado (Opcional)

### 1. No Vercel, vá em **Settings > Domains**

### 2. Adicione seu domínio:
- Exemplo: `meuapp.com`
- Ou subdomínio: `app.meuapp.com`

### 3. Configure DNS:
- Adicione registro CNAME apontando para `cname.vercel-dns.com`
- Ou registro A apontando para IP do Vercel

### 4. SSL será ativado automaticamente (HTTPS)

---

## 📱 Passo 8: Testar no iPhone Safari

### 1. Abra o Safari no iPhone

### 2. Digite o link do Vercel:
```
https://seu-projeto.vercel.app
```

### 3. Teste todas as funcionalidades:
- ✅ Notícias carregam
- ✅ PIN funciona
- ✅ Mensagens funcionam
- ✅ Swipe funciona
- ✅ Upload funciona

---

## 🔄 Deploys Automáticos

### Configuração Automática:

O Vercel faz deploy automaticamente quando você:

- ✅ Faz push para `main` → Deploy em **Production**
- ✅ Faz push para outras branches → Deploy em **Preview**
- ✅ Abre Pull Request → Deploy em **Preview**

### Desabilitar Deploy Automático (se necessário):

1. Vá em **Settings > Git**
2. Desmarque **"Automatically deploy"**

---

## 🐛 Troubleshooting

### Erro: "Build Failed"

**Possíveis causas:**
- ❌ Variáveis de ambiente faltando
- ❌ Erro de sintaxe no código
- ❌ Dependências não instaladas

**Solução:**
1. Verifique logs do build
2. Verifique se `yarn build` funciona localmente
3. Verifique se todas as variáveis estão configuradas

### Erro: "Environment variables missing"

**Solução:**
1. Vá em **Settings > Environment Variables**
2. Verifique se todas as variáveis obrigatórias estão lá
3. Verifique se estão marcadas para **Production**

### Erro: "Supabase connection failed"

**Solução:**
1. Verifique se a URL do Supabase está correta
2. Verifique se o projeto Supabase está ativo
3. Verifique se as chaves estão corretas

### App não carrega

**Solução:**
1. Verifique logs do deploy
2. Verifique console do navegador (F12)
3. Verifique se todas as variáveis estão configuradas
4. Tente fazer redeploy

---

## 📊 Monitoramento

### Ver Métricas:
- Vá em **Analytics** no Vercel
- Veja visitantes, performance, etc.

### Ver Logs:
- Vá em **Deployments > [deploy] > Logs**
- Veja logs em tempo real

### Ver Funções:
- Vá em **Functions** (se usar API routes)
- Veja execuções e erros

---

## ✅ Checklist Final

- [ ] Código commitado no GitHub
- [ ] Conta Vercel criada
- [ ] Repositório conectado
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy realizado com sucesso
- [ ] App funcionando no link do Vercel
- [ ] Testado no iPhone Safari
- [ ] Domínio customizado configurado (opcional)

---

## 🎉 Pronto!

Sua aplicação está online! 🚀

**Link do Vercel:** `https://seu-projeto.vercel.app`

Compartilhe esse link com quem quiser testar! 📱✨

---

## 🔗 Links Úteis

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Documentação Vercel**: https://vercel.com/docs
- **Status Vercel**: https://vercel-status.com
