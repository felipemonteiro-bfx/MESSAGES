# ⚡ Resumo Rápido - NewsAPI, Safari e Deploy

## 📰 1. Configurar NewsAPI (5 minutos)

### Passo 1: Obter Chave
1. Acesse: https://newsapi.org/register
2. Crie conta gratuita
3. Copie sua chave da API

### Passo 2: Adicionar Localmente
Edite `.env.local`:
```env
NEXT_PUBLIC_NEWS_API_KEY=sua-chave-aqui
```

### Passo 3: Reiniciar Servidor
```bash
yarn dev
```

**Pronto!** Notícias reais aparecerão no app.

---

## 📱 2. Testar no iPhone Safari

### Opção A: Testar Localmente (Mesma WiFi)
1. Descubra IP do PC: `ipconfig` (Windows)
2. No iPhone Safari: `http://SEU-IP:3005`
3. Teste tudo!

### Opção B: Testar Online (Mais Fácil)
1. Faça deploy no Vercel (veja passo 3)
2. Acesse o link do Vercel no iPhone
3. Teste tudo!

**Veja `TESTAR_NO_SAFARI.md` para guia completo.**

---

## 🚀 3. Deploy no Vercel (10 minutos)

### Passo 1: Preparar Git
```bash
cd C:\Users\Administrador\stealth-messaging
git init
git add .
git commit -m "Initial commit"
# Conecte com GitHub (veja abaixo)
```

### Passo 2: Criar Conta Vercel
1. Acesse: https://vercel.com/signup
2. Conecte com GitHub

### Passo 3: Conectar Repositório
1. No Vercel: "Add New Project"
2. Selecione seu repositório GitHub
3. Configure variáveis (veja abaixo)

### Passo 4: Variáveis de Ambiente
No Vercel > Settings > Environment Variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-aqui
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui
NEXT_PUBLIC_NEWS_API_KEY=sua-chave-newsapi
NODE_ENV=production
```

### Passo 5: Deploy
1. Clique em "Deploy"
2. Aguarde 2-5 minutos
3. Acesse o link gerado!

**Veja `DEPLOY_VERCEL.md` para guia completo.**

---

## ✅ Checklist Rápido

- [ ] NewsAPI configurada (local)
- [ ] NewsAPI configurada (Vercel)
- [ ] App testado localmente no iPhone
- [ ] Git inicializado e conectado ao GitHub
- [ ] Vercel conectado ao repositório
- [ ] Variáveis configuradas no Vercel
- [ ] Deploy realizado com sucesso
- [ ] App testado online no iPhone

---

## 🔗 Links Úteis

- **NewsAPI**: https://newsapi.org/register
- **Vercel**: https://vercel.com/signup
- **GitHub**: https://github.com/new

---

## 📚 Documentação Completa

- `CONFIGURAR_NEWSAPI.md` - Guia detalhado NewsAPI
- `TESTAR_NO_SAFARI.md` - Guia completo Safari
- `DEPLOY_VERCEL.md` - Guia completo Vercel

---

**Tempo Total Estimado:** ~20 minutos 🚀
