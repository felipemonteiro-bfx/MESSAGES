# ✅ Supabase Configurado no Projeto Stealth Messaging

## 🔐 Credenciais Configuradas

**URL do Projeto**: `https://moaxyoqjedgrfnxeskku.supabase.co`

**Chave Anon**: Configurada no `.env.local`

**Service Role Key**: Configurada no `.env.local` (para operações server-side)

## ✅ Próximos Passos no Supabase

### 1. Executar Script SQL

Acesse o **SQL Editor** no Supabase e execute:

1. Abra o arquivo `docs/messaging_schema.sql`
2. Copie TODO o conteúdo
3. Cole no SQL Editor do Supabase
4. Clique em **"Run"**

### 2. Criar Storage Bucket

1. Vá em **Storage** no menu lateral
2. Clique em **"Create bucket"**
3. Crie o bucket:

   **Bucket: `chat-media`**
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
   http://localhost:3005
   https://seu-dominio.vercel.app
   ```
   (Substitua pelo seu domínio real após deploy)

## 🧪 Testar Configuração

1. Execute o projeto:
   ```bash
   cd C:\Users\Administrador\stealth-messaging
   yarn install
   yarn dev
   ```

2. Acesse: http://localhost:3005

3. O sistema deve iniciar no modo notícias

4. Clique em "Fale Conosco" ou dê duplo clique na data/hora

5. Configure seu PIN (primeira vez)

6. Acesse o sistema de mensagens

## 📋 Checklist

- [x] Credenciais configuradas no `.env.local`
- [ ] Script `messaging_schema.sql` executado
- [ ] Bucket `chat-media` criado (privado)
- [ ] Realtime ativado nas tabelas
- [ ] CORS configurado
- [ ] Teste local bem-sucedido

## 🎯 Status

✅ **Credenciais configuradas localmente!**

Agora execute o script SQL no Supabase para criar as tabelas e começar a usar o sistema!

---

**Precisa de ajuda? Consulte `CONFIGURAR_SUPABASE.md` para guia completo!**
