# 🔧 Corrigir Erro: Tabela "profiles" Não Existe

## ❌ Erro Encontrado

```
ERROR: 42P01: relation "public.profiles" does not exist
```

**Causa:** A tabela `profiles` (e outras tabelas) não foram criadas no banco de dados ainda.

---

## ✅ Solução

### Passo 1: Executar Setup Completo

**Execute este arquivo PRIMEIRO:** `docs/SETUP_COMPLETO.sql`

Este arquivo cria:
- ✅ Tabela `profiles`
- ✅ Tabela `chats`
- ✅ Tabela `chat_participants`
- ✅ Tabela `messages`
- ✅ Bucket de storage `chat-media`
- ✅ Função `get_user_by_email`
- ✅ Função `update_user_nickname`
- ✅ Todas as policies (RLS)

### Passo 2: Como Executar

1. **Acesse Supabase:**
   - https://supabase.com/dashboard/project/moaxyoqjedgrfnxeskku
   - Vá em **SQL Editor**

2. **Abra o arquivo:**
   - `docs/SETUP_COMPLETO.sql`

3. **Copie TODO o conteúdo** (Ctrl+A, Ctrl+C)

4. **Cole no SQL Editor** (Ctrl+V)

5. **Execute** (botão Run ou Ctrl+Enter)

6. **Aguarde** alguns segundos

### Passo 3: Verificar se Funcionou

Você deve ver vários resultados:

**Resultado 1:** Contagem de registros nas tabelas
**Resultado 2:** Lista de funções criadas
**Resultado 3:** Lista de usuários
**Resultado 4:** Lista de profiles

### Passo 4: Testar Função

Agora você pode testar:

```sql
-- Ver usuários disponíveis
SELECT email FROM auth.users;

-- Testar função com um email real
SELECT * FROM get_user_by_email('EMAIL_QUE_EXISTE@exemplo.com');
```

---

## 📋 Checklist

- [ ] Executei `docs/SETUP_COMPLETO.sql`
- [ ] Vi os resultados das verificações
- [ ] Tabelas foram criadas (profiles, chats, messages, etc)
- [ ] Funções foram criadas (get_user_by_email, update_user_nickname)
- [ ] Testei a função com um email real

---

## 🎯 Ordem Correta de Execução

1. ✅ **PRIMEIRO:** Execute `docs/SETUP_COMPLETO.sql` (cria tudo)
2. ✅ **DEPOIS:** Teste a função `get_user_by_email`

**NÃO execute `buscar_por_email.sql` antes de executar `SETUP_COMPLETO.sql`!**

---

## 💡 Dica

Se você já executou `messaging_schema.sql` antes, pode executar apenas:

```sql
-- Criar tabela profiles se não existir
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  nickname TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  status TEXT,
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING ( true );
```

Mas é mais seguro executar o `SETUP_COMPLETO.sql` que cria tudo de uma vez!

---

**Execute o `SETUP_COMPLETO.sql` primeiro e depois teste novamente! 🚀**
