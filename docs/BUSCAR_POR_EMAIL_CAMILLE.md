# Buscar contato por email: camilleclteixeira@gmail.com

## No app

1. Abra as mensagens (Fale Conosco → PIN).
2. Clique no botão **+** (Adicionar contato).
3. No campo **"Nickname ou Email do usuário"**, digite:
   ```
   camilleclteixeira@gmail.com
   ```
4. Clique em **Adicionar**.

Se o usuário existir no Supabase (auth.users + profiles), o chat será criado.

---

## Se der "Usuário não encontrado" ou "Função não encontrada"

### 1. Criar a função no Supabase

1. Acesse [Supabase](https://app.supabase.com) → seu projeto → **SQL Editor**.
2. Abra o arquivo `docs/buscar_por_email.sql` (ou `docs/buscar_por_email_v2.sql`).
3. Copie todo o conteúdo e execute no SQL Editor.
4. Confirme que não há erros.

### 2. Verificar se o email existe

No SQL Editor, execute:

```sql
-- Ver se o email está em auth.users
SELECT id, email, created_at 
FROM auth.users 
WHERE LOWER(email) = 'camilleclteixeira@gmail.com';

-- Testar a função
SELECT * FROM get_user_by_email('camilleclteixeira@gmail.com');
```

- Se a primeira query não retornar nada, esse email ainda não tem conta no projeto.
- Se a segunda retornar vazio mas a primeira retornar uma linha, o perfil em `public.profiles` pode não existir para esse `id`. Crie o perfil:

```sql
-- Substituir USER_ID pelo id retornado na primeira query
INSERT INTO public.profiles (id, nickname, avatar_url)
VALUES (
  'USER_ID',
  'camille',  -- ou o nickname desejado
  'https://i.pravatar.cc/150?u=camille'
)
ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname;
```

### 3. Busca case-insensitive

A função usa `LOWER(email) = LOWER(user_email)`, então tanto `camilleclteixeira@gmail.com` quanto `Camilleclteixeira@Gmail.com` funcionam.

---

## Resumo

| Onde              | O que fazer |
|-------------------|-------------|
| **No app**        | Adicionar contato → digitar `camilleclteixeira@gmail.com` → Adicionar |
| **Supabase**      | Ter a função `get_user_by_email` criada (`docs/buscar_por_email.sql`) |
| **auth.users**    | Existir um usuário com esse email |
| **public.profiles** | Existir uma linha com o mesmo `id` e um `nickname` |
