# 🔐 Configuração Completa do Supabase - Guia Passo a Passo

## ✅ SIM, É NECESSÁRIO VINCULAR COM SUPABASE!

O Supabase é essencial para:
- ✅ Autenticação de usuários
- ✅ Banco de dados (PostgreSQL)
- ✅ Storage (fotos, vídeos, áudio)
- ✅ Realtime (mensagens em tempo real)

## 🚀 Passo 1: Criar Conta e Projeto no Supabase

### 1.1 Criar Conta
1. Acesse: https://supabase.com
2. Clique em **"Start your project"** ou **"Sign Up"**
3. Faça login com GitHub, Google ou email

### 1.2 Criar Novo Projeto
1. No dashboard, clique em **"New Project"**
2. Preencha:
   - **Name**: `warranty-tracker` (ou outro nome)
   - **Database Password**: Crie uma senha forte (GUARDE BEM!)
   - **Region**: Escolha a região mais próxima (ex: South America - São Paulo)
   - **Pricing Plan**: Free (gratuito)
3. Clique em **"Create new project"**
4. Aguarde 2-3 minutos para o projeto ser criado

## 🔑 Passo 2: Obter Chaves de API

1. No dashboard do projeto, vá em **Settings** (ícone de engrenagem)
2. Clique em **API**
3. Copie as seguintes informações:

```
Project URL: https://xxxxx.supabase.co
anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**⚠️ IMPORTANTE**: Guarde essas informações! Você precisará delas.

## 📊 Passo 3: Criar Tabelas no Banco de Dados

### 3.1 Acessar SQL Editor
1. No menu lateral, clique em **SQL Editor**
2. Clique em **"New query"**

### 3.2 Executar Script Principal
1. Abra o arquivo `docs/schema.sql` do projeto
2. Copie TODO o conteúdo
3. Cole no SQL Editor do Supabase
4. Clique em **"Run"** (ou pressione Ctrl+Enter)
5. Aguarde a confirmação: "Success. No rows returned"

### 3.3 Executar Script de Mensagens
1. Abra o arquivo `docs/messaging_schema.sql` do projeto
2. Copie TODO o conteúdo
3. Cole no SQL Editor do Supabase
4. Clique em **"Run"**
5. Verifique se todas as tabelas foram criadas

### 3.4 Verificar Tabelas Criadas
1. No menu lateral, clique em **Table Editor**
2. Você deve ver as seguintes tabelas:
   - ✅ `warranties`
   - ✅ `profiles`
   - ✅ `chats`
   - ✅ `chat_participants`
   - ✅ `messages`

## 📦 Passo 4: Configurar Storage Buckets

### 4.1 Criar Bucket para Notas Fiscais
1. No menu lateral, clique em **Storage**
2. Clique em **"Create bucket"**
3. Preencha:
   - **Name**: `invoices`
   - **Public bucket**: ✅ Marque como PÚBLICO
4. Clique em **"Create bucket"**

### 4.2 Criar Bucket para Mídia de Mensagens
1. Clique em **"Create bucket"** novamente
2. Preencha:
   - **Name**: `chat-media`
   - **Public bucket**: ❌ Deixe PRIVADO
3. Clique em **"Create bucket"**

### 4.3 Configurar Políticas de Storage
As políticas já foram criadas pelo script SQL, mas verifique:

1. Vá em **Storage** > **Policies**
2. Verifique se existem políticas para:
   - `invoices` bucket (upload e leitura)
   - `chat-media` bucket (upload e leitura)

## 🔄 Passo 5: Ativar Realtime (Para Mensagens)

### 5.1 Ativar Realtime nas Tabelas
1. No menu lateral, clique em **Database**
2. Clique em **Replication**
3. Ative a replicação para:
   - ✅ `messages`
   - ✅ `chats`
   - ✅ `chat_participants`

**Como fazer:**
- Clique no toggle ao lado de cada tabela
- Ou execute no SQL Editor:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chats;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_participants;
```

## 🌐 Passo 6: Configurar CORS (Para Deploy)

### 6.1 Adicionar Domínios Permitidos
1. Vá em **Settings** > **API**
2. Role até **"CORS"** ou **"Allowed CORS Origins"**
3. Adicione os seguintes domínios:

```
http://localhost:3001
https://seu-projeto.vercel.app
```

**Nota**: Substitua `seu-projeto.vercel.app` pelo seu domínio real após fazer deploy.

## ⚙️ Passo 7: Configurar Variáveis de Ambiente Local

### 7.1 Criar Arquivo .env.local
1. No projeto local, copie o arquivo de exemplo:
   ```bash
   cp .env.example .env.local
   ```

### 7.2 Editar .env.local
Abra o arquivo `.env.local` e preencha com suas chaves do Supabase:

```env
# Supabase Configuration (OBRIGATÓRIO)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe Configuration (Opcional - se usar pagamentos)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# News API (Opcional - para notícias reais)
NEXT_PUBLIC_NEWS_API_KEY=sua-chave-aqui

# Node Environment
NODE_ENV=development
```

**⚠️ IMPORTANTE**: 
- Substitua `xxxxx` pela URL real do seu projeto
- Substitua a chave anon pela chave real
- NUNCA commite o arquivo `.env.local` no Git!

## ✅ Passo 8: Verificar Configuração

### 8.1 Testar Conexão
1. Execute o projeto:
   ```bash
   yarn dev
   ```
2. Acesse: http://localhost:3001
3. Tente fazer login/cadastro
4. Se funcionar, está tudo configurado! ✅

### 8.2 Verificar no Supabase
1. Vá em **Authentication** > **Users**
2. Tente criar um usuário pelo app
3. Você deve ver o usuário aparecer aqui

## 🔒 Passo 9: Configurar Row Level Security (RLS)

As políticas RLS já foram criadas pelos scripts SQL, mas verifique:

1. Vá em **Authentication** > **Policies**
2. Ou em **Table Editor** > Selecione uma tabela > **"RLS enabled"**
3. Todas as tabelas devem ter RLS ativado

## 📱 Passo 10: Configurar para Produção (Vercel)

Quando fizer deploy no Vercel:

1. No Vercel Dashboard, vá em **Settings** > **Environment Variables**
2. Adicione as mesmas variáveis do `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
3. Adicione também o domínio do Vercel no CORS do Supabase

## 🐛 Troubleshooting

### Erro: "Invalid Supabase URL"
- Verifique se a URL está correta (sem espaços, sem caracteres extras)
- Deve começar com `https://` e terminar com `.supabase.co`

### Erro: "Invalid API key"
- Verifique se copiou a chave completa (é muito longa)
- Use a chave **anon public**, não a **service_role**

### Erro: "Table does not exist"
- Execute novamente os scripts SQL
- Verifique se está no projeto correto do Supabase

### Mensagens não aparecem em tempo real
- Verifique se o Realtime está ativado (Passo 5)
- Verifique se as políticas RLS permitem leitura

### Upload de arquivos falha
- Verifique se os buckets foram criados
- Verifique as políticas de Storage
- Verifique se o bucket está público (invoices) ou privado (chat-media)

## 📋 Checklist Completo

- [ ] Conta criada no Supabase
- [ ] Projeto criado
- [ ] Chaves de API copiadas
- [ ] Script `schema.sql` executado
- [ ] Script `messaging_schema.sql` executado
- [ ] Bucket `invoices` criado (público)
- [ ] Bucket `chat-media` criado (privado)
- [ ] Realtime ativado nas tabelas de mensagens
- [ ] CORS configurado
- [ ] Arquivo `.env.local` criado e preenchido
- [ ] Teste de conexão bem-sucedido
- [ ] Usuário de teste criado
- [ ] Variáveis configuradas no Vercel (quando fizer deploy)

## 🎯 Próximos Passos

Após configurar o Supabase:
1. ✅ Teste localmente (`yarn dev`)
2. ✅ Crie um usuário de teste
3. ✅ Teste o sistema de mensagens
4. ✅ Faça deploy no Vercel
5. ✅ Configure variáveis no Vercel

---

**Tudo configurado? Teste o sistema e me avise se precisar de ajuda!** 🚀
