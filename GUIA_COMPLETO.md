# 🎯 Guia Completo - NewsAPI, Safari e Deploy

## 📰 PARTE 1: Configurar NewsAPI

### ⏱️ Tempo: 5 minutos

1. **Obter Chave Gratuita:**
   - Acesse: https://newsapi.org/register
   - Crie conta (email + senha)
   - Confirme email
   - Copie sua chave da API

2. **Adicionar Localmente:**
   - Edite `C:\Users\Administrador\stealth-messaging\.env.local`
   - Adicione: `NEXT_PUBLIC_NEWS_API_KEY=sua-chave-aqui`
   - Salve o arquivo

3. **Reiniciar Servidor:**
   ```bash
   # Pare o servidor (Ctrl+C)
   yarn dev
   ```

4. **Testar:**
   - Abra http://localhost:3005
   - Veja se notícias reais aparecem (em vez das mock)

**✅ Pronto!** Veja `CONFIGURAR_NEWSAPI.md` para detalhes.

---

## 📱 PARTE 2: Testar no iPhone Safari

### ⏱️ Tempo: 2 minutos

### Opção A: Testar Localmente (Mesma WiFi)

1. **Descobrir IP do PC:**
   ```powershell
   ipconfig
   ```
   Procure "IPv4 Address" (exemplo: `192.168.1.100`)

2. **Iniciar Servidor:**
   ```bash
   cd C:\Users\Administrador\stealth-messaging
   yarn dev
   ```

3. **No iPhone Safari:**
   - Digite: `http://SEU-IP:3005`
   - Exemplo: `http://192.168.1.100:3005`

### Opção B: Testar Online (Mais Fácil)

1. **Faça deploy no Vercel primeiro** (veja Parte 3)
2. **Acesse o link do Vercel no iPhone**
3. **Teste tudo!**

**✅ Pronto!** Veja `TESTAR_NO_SAFARI.md` para guia completo.

---

## 🚀 PARTE 3: Deploy no Vercel

### ⏱️ Tempo: 10 minutos

### Passo 1: Preparar Git (se necessário)

Se o projeto ainda não está no GitHub:

```bash
cd C:\Users\Administrador\stealth-messaging

# Inicializar Git (se não tiver)
git init

# Adicionar arquivos
git add .

# Commit
git commit -m "feat: melhorias stealth - notícias, mobile, performance"

# Conectar com GitHub existente
git remote add origin https://github.com/felipemonteiro-bfx/MESSAGES.git

# Push
git push -u origin main
```

### Passo 2: Criar Conta Vercel

1. Acesse: https://vercel.com/signup
2. Clique em **"Continue with GitHub"**
3. Autorize o Vercel

### Passo 3: Conectar Repositório

1. No Dashboard do Vercel: **"Add New Project"**
2. Selecione: `felipemonteiro-bfx/MESSAGES`
3. Configure:
   - **Framework:** Next.js (auto-detectado)
   - **Root Directory:** `./`
   - **Build Command:** `yarn build` (ou deixe vazio)
   - **Output Directory:** `.next` (ou deixe vazio)

### Passo 4: Variáveis de Ambiente

No Vercel > **Settings > Environment Variables**, adicione:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-aqui
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui
NEXT_PUBLIC_NEWS_API_KEY=sua-chave-newsapi-aqui
NODE_ENV=production
```

**Para cada variável:**
- ✅ Marque **Production**
- ✅ Marque **Preview**
- ✅ Clique em **Save**

### Passo 5: Deploy

1. Clique em **"Deploy"**
2. Aguarde 2-5 minutos
3. Quando aparecer "Ready", clique no link!

**✅ Pronto!** Seu app está online! 🎉

**Veja `DEPLOY_VERCEL.md` para guia completo.**

---

## ✅ Checklist Final

### NewsAPI
- [ ] Conta criada no NewsAPI.org
- [ ] Chave copiada
- [ ] Adicionada no `.env.local`
- [ ] Adicionada no Vercel
- [ ] Servidor reiniciado
- [ ] Notícias reais aparecem

### Safari
- [ ] App testado localmente (se aplicável)
- [ ] App testado online no Vercel
- [ ] Swipe funciona
- [ ] Input não esconde com teclado
- [ ] PIN funciona
- [ ] Mensagens funcionam
- [ ] Upload funciona

### Deploy
- [ ] Git inicializado e conectado
- [ ] Código commitado e pushado
- [ ] Conta Vercel criada
- [ ] Repositório conectado
- [ ] Variáveis configuradas
- [ ] Deploy realizado
- [ ] App funcionando online

---

## 🔗 Links Importantes

- **Repositório GitHub:** https://github.com/felipemonteiro-bfx/MESSAGES
- **NewsAPI:** https://newsapi.org/register
- **Vercel:** https://vercel.com/signup
- **Local:** http://localhost:3005

---

## 📚 Documentação Completa

- `CONFIGURAR_NEWSAPI.md` - Guia detalhado NewsAPI
- `TESTAR_NO_SAFARI.md` - Guia completo Safari
- `DEPLOY_VERCEL.md` - Guia completo Vercel
- `RESUMO_RAPIDO.md` - Resumo rápido de tudo

---

## 🎉 Pronto!

Agora você tem:
- ✅ NewsAPI configurada
- ✅ App testado no Safari
- ✅ App online no Vercel

**Tempo Total:** ~20 minutos 🚀

---

## 🆘 Precisa de Ajuda?

Se algo não funcionar:
1. Verifique os logs do Vercel (Deployments > Logs)
2. Verifique o console do navegador (F12)
3. Verifique se todas as variáveis estão configuradas
4. Veja os guias detalhados em cada arquivo `.md`

**Boa sorte! 🍀**
