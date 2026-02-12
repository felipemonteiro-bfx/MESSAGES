# 🚀 Integração Automática com Vercel

## 🎯 Método Rápido (Recomendado)

### Opção 1: Via Dashboard Web (Mais Fácil)

1. **Acesse:** https://vercel.com/dashboard
2. **Clique em:** "Add New Project" ou "Import Project"
3. **Conecte GitHub** (se necessário)
4. **Selecione:** `felipemonteiro-bfx/MESSAGES`
5. **Configure:**
   - Framework: Next.js (auto-detectado)
   - Root Directory: `./`
   - Build Command: `yarn build` (ou deixe vazio)
   - Output Directory: `.next` (ou deixe vazio)
6. **Configure Variáveis** (veja abaixo)
7. **Clique em:** "Deploy"

### Opção 2: Via Script PowerShell

```powershell
cd C:\Users\Administrador\stealth-messaging
.\scripts\setup-vercel.ps1
```

---

## 📋 Variáveis de Ambiente para Configurar

**No Vercel Dashboard > Settings > Environment Variables:**

Adicione estas variáveis (marque Production, Preview e Development):

```env
NEXT_PUBLIC_SUPABASE_URL=https://moaxyoqjedgrfnxeskku.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_eaIUZoh1qAkdWVcAm9VYrg_cp0fcgsM
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui
NEXT_PUBLIC_NEWS_API_KEY=da189e9058564f9ab155924a751cccef
NODE_ENV=production
```

---

## 🔧 Método Via CLI (Linha de Comando)

### Passo 1: Login (se necessário)
```powershell
vercel login
```
Abra o link no navegador e faça login.

### Passo 2: Linkar Projeto
```powershell
cd C:\Users\Administrador\stealth-messaging
vercel link
```

Siga as instruções:
- Escolha: **Link to existing project**
- Selecione: `felipemonteiro-bfx/MESSAGES`
- Ou crie novo projeto

### Passo 3: Adicionar Variáveis (via CLI ou Dashboard)

**Via Dashboard (Mais Fácil):**
1. Acesse: https://vercel.com/dashboard
2. Seu Projeto > Settings > Environment Variables
3. Adicione cada variável

**Via CLI:**
```powershell
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# Cole: https://moaxyoqjedgrfnxeskku.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# Cole: sb_publishable_eaIUZoh1qAkdWVcAm9VYrg_cp0fcgsM

vercel env add NEXT_PUBLIC_NEWS_API_KEY production
# Cole: da189e9058564f9ab155924a751cccef

vercel env add NODE_ENV production
# Cole: production
```

### Passo 4: Deploy
```powershell
# Deploy para produção
vercel --prod

# Ou deploy para preview
vercel
```

---

## ✅ Verificação

### 1. Verificar Build
- Vá em **Deployments** no Vercel
- Clique no deploy mais recente
- Deve mostrar: `✓ Compiled successfully`

### 2. Testar App
- Clique no link do deploy
- App deve carregar
- Notícias devem aparecer

### 3. Verificar Variáveis
- Vá em **Settings > Environment Variables**
- Verifique se todas estão configuradas
- Verifique se estão marcadas para **Production**

---

## 🎯 Resumo Rápido

**Método Mais Fácil:**
1. Acesse: https://vercel.com/dashboard
2. Importe projeto: `felipemonteiro-bfx/MESSAGES`
3. Configure variáveis (veja lista acima)
4. Deploy!

**Tempo:** ~5 minutos

---

**Escolha o método que preferir e siga os passos! 🚀**
