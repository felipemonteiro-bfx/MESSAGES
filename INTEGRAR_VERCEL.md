# 🚀 Integrar Projeto com Vercel - Guia Completo

## 🎯 Método 1: Via Script Automatizado (Recomendado)

### Passo 1: Executar Script
```powershell
cd C:\Users\Administrador\stealth-messaging
.\scripts\integrar-vercel.ps1
```

O script vai:
- ✅ Verificar/instalar Vercel CLI
- ✅ Fazer login (se necessário)
- ✅ Linkar projeto
- ✅ Fazer deploy (opcional)

---

## 🎯 Método 2: Via Dashboard Web (Mais Fácil)

### Passo 1: Acessar Vercel
1. Abra: https://vercel.com/dashboard
2. Faça login (ou crie conta)

### Passo 2: Adicionar Projeto
1. Clique em **"Add New Project"** ou **"Import Project"**
2. Selecione **GitHub**
3. Autorize o Vercel (se necessário)
4. Procure por: `felipemonteiro-bfx/MESSAGES`
5. Clique em **Import**

### Passo 3: Configurar Projeto
- **Framework Preset:** Next.js (auto-detectado)
- **Root Directory:** `./` (raiz)
- **Build Command:** `yarn build` (ou deixe vazio)
- **Output Directory:** `.next` (ou deixe vazio)
- **Install Command:** `yarn install` (ou deixe vazio)

### Passo 4: Configurar Variáveis de Ambiente
**ANTES de fazer deploy**, configure as variáveis:

1. Clique em **"Environment Variables"**
2. Adicione cada variável:

```env
NEXT_PUBLIC_SUPABASE_URL=https://moaxyoqjedgrfnxeskku.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_eaIUZoh1qAkdWVcAm9VYrg_cp0fcgsM
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui
NEXT_PUBLIC_NEWS_API_KEY=da189e9058564f9ab155924a751cccef
NODE_ENV=production
```

**Para cada variável:**
- ✅ Marque **Production**
- ✅ Marque **Preview**
- ✅ Marque **Development** (opcional)
- Clique em **Save**

### Passo 5: Deploy
1. Clique em **"Deploy"**
2. Aguarde 2-5 minutos
3. Quando aparecer "Ready", clique no link!

---

## 🎯 Método 3: Via CLI (Linha de Comando)

### Passo 1: Instalar Vercel CLI
```powershell
npm install -g vercel
```

### Passo 2: Login
```powershell
vercel login
```
Abra o navegador e faça login quando solicitado.

### Passo 3: Linkar Projeto
```powershell
cd C:\Users\Administrador\stealth-messaging
vercel link
```

Siga as instruções:
- Escolha: **Link to existing project**
- Selecione seu projeto ou crie novo
- Escolha o repositório: `felipemonteiro-bfx/MESSAGES`

### Passo 4: Configurar Variáveis
```powershell
# Adicionar variáveis via CLI (ou configure no dashboard)
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# Cole o valor quando solicitado

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# Cole o valor quando solicitado

vercel env add NEXT_PUBLIC_NEWS_API_KEY production
# Cole: da189e9058564f9ab155924a751cccef

vercel env add NODE_ENV production
# Cole: production
```

### Passo 5: Deploy
```powershell
# Deploy para preview
vercel

# Deploy para produção
vercel --prod
```

---

## ✅ Verificação Pós-Deploy

### 1. Verificar Build
- Vá em **Deployments** no Vercel
- Clique no deploy mais recente
- Verifique logs: deve mostrar `✓ Compiled successfully`

### 2. Testar App
- Clique no link do deploy
- App deve carregar
- Notícias devem aparecer
- Login deve funcionar

### 3. Verificar Variáveis
- Vá em **Settings > Environment Variables**
- Verifique se todas as variáveis estão lá
- Verifique se estão marcadas para **Production**

---

## 🐛 Troubleshooting

### Erro: "Build failed"
**Solução:**
- Verifique logs do build
- Verifique se todas as variáveis estão configuradas
- Verifique se `yarn build` funciona localmente

### Erro: "Environment variables missing"
**Solução:**
- Vá em **Settings > Environment Variables**
- Adicione todas as variáveis obrigatórias
- Marque para **Production**

### Erro: "Supabase connection failed"
**Solução:**
- Verifique se a URL do Supabase está correta
- Verifique se o projeto Supabase está ativo
- Verifique se as chaves estão corretas

---

## 📋 Checklist Final

- [ ] Projeto linkado ao GitHub
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy realizado
- [ ] Build passou sem erros
- [ ] App funcionando online
- [ ] Notícias aparecem
- [ ] Login funciona

---

## 🎉 Pronto!

Após seguir um dos métodos acima, seu app estará online no Vercel! 🚀

**Link do Vercel:** `https://seu-projeto.vercel.app`

---

**Escolha o método que preferir e siga os passos! 🎯**
