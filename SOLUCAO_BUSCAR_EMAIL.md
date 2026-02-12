# 🔧 Solução - Buscar por Email Não Funciona

## ❌ Problema
Não conseguiu executar: `SELECT * FROM get_user_by_email('teste@stealth.com');`

## ✅ Soluções Possíveis

### Solução 1: Função Não Foi Criada
**Sintoma:** Erro "function get_user_by_email does not exist"

**Solução:**
1. Execute o SQL atualizado: `docs/buscar_por_email.sql` (versão corrigida)
2. Ou use: `docs/buscar_por_email_v2.sql` (versão melhorada)

### Solução 2: Usuário Não Existe
**Sintoma:** Função retorna vazio

**Verificar:**
```sql
-- Ver se usuário existe
SELECT id, email FROM auth.users WHERE email = 'teste@stealth.com';
```

**Se não existir:**
1. Vá em **Authentication > Users**
2. Clique em **Add User**
3. Preencha:
   - Email: `teste@stealth.com`
   - Password: (crie uma senha)
   - Auto Confirm User: ✅ (marcado)
4. Clique em **Create User**

### Solução 3: Usuário Não Tem Profile
**Sintoma:** Usuário existe mas função retorna vazio

**Verificar:**
```sql
-- Ver se profile existe
SELECT id, nickname FROM public.profiles 
WHERE id IN (SELECT id FROM auth.users WHERE email = 'teste@stealth.com');
```

**Se não existir, criar:**
```sql
INSERT INTO public.profiles (id, nickname)
SELECT id, 'teste' 
FROM auth.users 
WHERE email = 'teste@stealth.com'
ON CONFLICT (id) DO UPDATE SET nickname = 'teste';
```

### Solução 4: Email Está Escrito Errado
**Sintoma:** Função retorna vazio mas usuário existe

**Verificar email exato:**
```sql
-- Ver todos os emails (case-sensitive)
SELECT email FROM auth.users ORDER BY email;
```

**Importante:** O email é case-sensitive! `teste@stealth.com` ≠ `Teste@stealth.com`

---

## 🎯 Passo a Passo Completo

### 1. Verificar se Função Existe
```sql
SELECT proname 
FROM pg_proc 
WHERE proname = 'get_user_by_email';
```

**Se não retornar nada:** Execute `docs/buscar_por_email.sql`

### 2. Verificar Usuários
```sql
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC;
```

**Anote o email exato** do usuário que quer testar.

### 3. Verificar Profiles
```sql
SELECT p.id, p.nickname, u.email
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
ORDER BY p.created_at DESC;
```

**Verifique se o usuário tem profile.**

### 4. Criar Profile (se necessário)
```sql
-- Substitua 'EMAIL_AQUI' pelo email real
INSERT INTO public.profiles (id, nickname)
SELECT id, COALESCE(
  (SELECT nickname FROM public.profiles WHERE id = auth.users.id),
  'user_' || substring(id::text, 1, 8)
)
FROM auth.users 
WHERE email = 'EMAIL_AQUI'
ON CONFLICT (id) DO NOTHING;
```

### 5. Testar Função
```sql
-- Use o email EXATO do passo 2
SELECT * FROM get_user_by_email('EMAIL_EXATO_AQUI');
```

---

## 📋 Checklist de Diagnóstico

Execute estes comandos e me diga os resultados:

```sql
-- 1. Função existe?
SELECT proname FROM pg_proc WHERE proname = 'get_user_by_email';

-- 2. Quantos usuários existem?
SELECT COUNT(*) as total_usuarios FROM auth.users;

-- 3. Listar emails dos usuários
SELECT email FROM auth.users ORDER BY email;

-- 4. Quantos profiles existem?
SELECT COUNT(*) as total_profiles FROM public.profiles;

-- 5. Listar profiles com emails
SELECT p.nickname, u.email
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
ORDER BY p.created_at DESC;
```

---

## 🚀 SQL Completo para Executar

Execute este SQL completo no Supabase:

```sql
-- 1. Criar/Atualizar função
DROP FUNCTION IF EXISTS get_user_by_email(TEXT);

CREATE OR REPLACE FUNCTION get_user_by_email(user_email TEXT)
RETURNS TABLE (
  id UUID,
  nickname TEXT,
  avatar_url TEXT,
  status TEXT,
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_id UUID;
BEGIN
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = user_email
  LIMIT 1;
  
  IF user_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id,
    p.nickname,
    p.avatar_url,
    p.status,
    p.last_seen,
    p.created_at
  FROM public.profiles p
  WHERE p.id = user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_by_email(TEXT) TO authenticated;

-- 2. Verificar função criada
SELECT proname, pg_get_function_arguments(oid) 
FROM pg_proc 
WHERE proname = 'get_user_by_email';

-- 3. Listar usuários disponíveis
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC;

-- 4. Listar profiles disponíveis
SELECT p.id, p.nickname, u.email
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
ORDER BY p.created_at DESC;
```

---

## 💡 Dica

**Use um email que você SABE que existe!**

Se não souber qual email usar:
1. Execute: `SELECT email FROM auth.users;`
2. Escolha um email da lista
3. Teste com esse email: `SELECT * FROM get_user_by_email('EMAIL_ESCOLHIDO');`

---

**Execute o SQL acima e me diga qual erro aparece ou qual resultado você obtém! 🔍**
