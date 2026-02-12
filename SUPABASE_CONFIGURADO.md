# ✅ Supabase Configurado com Sucesso!

## 🔐 Credenciais Configuradas

**URL do Projeto**: `https://moaxyoqjedgrfnxeskku.supabase.co`

**Chave Anon**: Configurada no `.env.local`

## ✅ Próximos Passos no Supabase

### 1. Executar Scripts SQL

Acesse o **SQL Editor** no Supabase e execute:

#### Script 1: Schema Principal
1. Abra o arquivo `docs/schema.sql`
2. Copie TODO o conteúdo
3. Cole no SQL Editor do Supabase
4. Clique em **"Run"**

#### Script 2: Schema de Mensagens
1. Abra o arquivo `docs/messaging_schema.sql`
2. Copie TODO o conteúdo
3. Cole no SQL Editor do Supabase
4. Clique em **"Run"**

### 2. Criar Storage Buckets

1. Vá em **Storage** no menu lateral
2. Clique em **"Create bucket"**
3. Crie dois buckets:

   **Bucket 1: `invoices`**
   - Name: `invoices`
   - Public: ✅ SIM (público)

   **Bucket 2: `chat-media`**
   - Name: `chat-media`
   - Public: ❌ NÃO (privado)

### 3. Ativar Realtime

1. Vá em **Database** > **Replication**
2. Ative a replicação para:
   - ✅ `messages`
   - ✅ `chats`
   - ✅ `chat_participants`

Ou execute no SQL Editor:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chats;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_participants;
```

### 4. Configurar CORS (Para Deploy)

1. Vá em **Settings** > **API**
2. Em **"Allowed CORS Origins"**, adicione:
   ```
   http://localhost:3001
   https://messages.vercel.app
   ```
   (Substitua pelo seu domínio real após deploy)

## 🧪 Testar Configuração

1. Execute o projeto:
   ```bash
   yarn dev
   ```

2. Acesse: http://localhost:3001

3. Tente criar uma conta/login

4. Se funcionar, está tudo configurado! ✅

## 📋 Checklist

- [x] Credenciais configuradas no `.env.local`
- [ ] Script `schema.sql` executado
- [ ] Script `messaging_schema.sql` executado
- [ ] Bucket `invoices` criado (público)
- [ ] Bucket `chat-media` criado (privado)
- [ ] Realtime ativado nas tabelas
- [ ] CORS configurado
- [ ] Teste local bem-sucedido

## 🎯 Status

✅ **Credenciais configuradas localmente!**

Agora execute os scripts SQL no Supabase para criar as tabelas e começar a usar o sistema!

---

**Precisa de ajuda? Consulte `CONFIGURAR_SUPABASE.md` para guia completo!**
