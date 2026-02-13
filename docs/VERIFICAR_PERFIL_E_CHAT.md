# 🔍 Como Verificar Perfil e Resolver Problemas de Chat

## ✅ Verificação Passo a Passo

### 1. Verificar se o Perfil Foi Criado

Execute no **Supabase SQL Editor**:

```sql
-- Verificar seu perfil
SELECT id, nickname, avatar_url, created_at 
FROM public.profiles 
WHERE id = auth.uid();

-- Ou verificar todos os perfis
SELECT id, nickname, avatar_url, created_at 
FROM public.profiles 
ORDER BY created_at DESC 
LIMIT 10;
```

**O que verificar:**
- ✅ O perfil deve existir
- ✅ Deve ter um `nickname` (não pode ser NULL)
- ✅ O nickname deve ter entre 3 e 20 caracteres
- ✅ O nickname deve conter apenas letras minúsculas, números e underscore

### 2. Verificar se o Nickname Está Correto

O nickname deve seguir estas regras:
- Mínimo: 3 caracteres
- Máximo: 20 caracteres
- Apenas: letras minúsculas (a-z), números (0-9) e underscore (_)
- Exemplos válidos: `joao123`, `maria_silva`, `user_01`
- Exemplos inválidos: `João` (maiúscula), `joão` (acento), `jo ao` (espaço)

### 3. Criar/Corrigir Perfil Manualmente

Se o perfil não existe ou não tem nickname, execute:

```sql
-- Substitua 'seu_nickname_aqui' pelo nickname desejado
-- E substitua 'seu_user_id' pelo seu ID de usuário (encontre em auth.users)

INSERT INTO public.profiles (id, nickname, avatar_url)
VALUES (
  auth.uid(), -- ou 'seu_user_id' se não estiver autenticado
  'seu_nickname_aqui',
  'https://i.pravatar.cc/150?u=' || auth.uid()
)
ON CONFLICT (id) 
DO UPDATE SET 
  nickname = EXCLUDED.nickname,
  avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url);
```

### 4. Verificar Chats Existentes

```sql
-- Ver seus chats
SELECT 
  c.id as chat_id,
  c.type,
  c.created_at,
  cp.user_id,
  p.nickname
FROM public.chats c
JOIN public.chat_participants cp ON c.id = cp.chat_id
JOIN public.profiles p ON cp.user_id = p.id
WHERE cp.user_id = auth.uid()
ORDER BY c.created_at DESC;
```

### 5. Verificar se Pode Buscar Outros Usuários

```sql
-- Buscar usuário por nickname
SELECT id, nickname, avatar_url 
FROM public.profiles 
WHERE nickname = 'nickname_do_usuario';

-- Buscar usuário por email (requer função RPC)
SELECT * FROM get_user_by_email('email@exemplo.com');
```

---

## 🐛 Problemas Comuns e Soluções

### Problema 1: "Perfil criado mas não consigo adicionar nickname"

**Causa:** O perfil pode ter sido criado sem nickname ou com nickname inválido.

**Solução:**
1. Verifique se o perfil tem nickname (SQL acima)
2. Se não tiver, atualize manualmente:
```sql
UPDATE public.profiles 
SET nickname = 'seu_nickname_valido'
WHERE id = auth.uid();
```

### Problema 2: "Não consigo iniciar conversa"

**Causas possíveis:**
1. Perfil sem nickname
2. Usuário que você está tentando adicionar não existe
3. Nickname digitado incorretamente
4. Problema de permissões (RLS)

**Solução:**
1. Verifique se seu perfil tem nickname válido
2. Verifique se o usuário que você quer adicionar existe:
```sql
SELECT id, nickname FROM public.profiles WHERE nickname = 'nickname_procurado';
```
3. Verifique permissões RLS:
```sql
-- Verificar políticas de profiles
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Verificar políticas de chats
SELECT * FROM pg_policies WHERE tablename = 'chats';
```

### Problema 3: "Usuário não encontrado"

**Causas:**
1. Nickname digitado incorretamente (case-sensitive)
2. Usuário não existe
3. Problema na busca

**Solução:**
1. Certifique-se de digitar o nickname exatamente como está salvo (minúsculas)
2. Verifique se o usuário existe:
```sql
SELECT nickname FROM public.profiles WHERE nickname LIKE '%parte_do_nickname%';
```
3. Tente buscar por email se a função RPC estiver disponível

### Problema 4: "Erro ao criar chat"

**Causas:**
1. Problema de permissões RLS
2. Chat já existe entre os dois usuários
3. Erro ao inserir participantes

**Solução:**
1. Verifique se as políticas RLS estão corretas
2. Verifique se já existe um chat:
```sql
-- Verificar se já existe chat entre dois usuários
SELECT DISTINCT c.id, c.type
FROM public.chats c
JOIN public.chat_participants cp1 ON c.id = cp1.chat_id
JOIN public.chat_participants cp2 ON c.id = cp2.chat_id
WHERE cp1.user_id = 'seu_user_id' 
  AND cp2.user_id = 'outro_user_id'
  AND c.type = 'private';
```

---

## 🔧 Scripts Úteis

### Criar Perfil Completo (se não existir)

```sql
-- Criar perfil com nickname válido
INSERT INTO public.profiles (id, nickname, avatar_url)
SELECT 
  id,
  'user_' || substring(id::text, 1, 8),
  'https://i.pravatar.cc/150?u=' || id
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
```

### Listar Todos os Usuários com Nickname

```sql
SELECT 
  p.id,
  p.nickname,
  p.avatar_url,
  u.email,
  p.created_at
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
ORDER BY p.created_at DESC;
```

### Verificar Chats e Participantes

```sql
SELECT 
  c.id as chat_id,
  c.type,
  c.created_at,
  array_agg(p.nickname) as participantes
FROM public.chats c
JOIN public.chat_participants cp ON c.id = cp.chat_id
JOIN public.profiles p ON cp.user_id = p.id
GROUP BY c.id, c.type, c.created_at
ORDER BY c.created_at DESC;
```

---

## 📝 Checklist de Verificação

Antes de tentar adicionar um contato, verifique:

- [ ] Meu perfil existe na tabela `profiles`
- [ ] Meu perfil tem um `nickname` válido (3-20 chars, a-z0-9_)
- [ ] O nickname que estou procurando existe
- [ ] O nickname está digitado corretamente (minúsculas, sem espaços)
- [ ] Não estou tentando adicionar a mim mesmo
- [ ] As políticas RLS estão configuradas corretamente

---

## 🆘 Se Nada Funcionar

1. **Verifique os logs do navegador:**
   - Abra DevTools (F12)
   - Vá na aba Console
   - Procure por erros em vermelho
   - Procure por mensagens de log que começam com "Error" ou "Failed"

2. **Verifique os logs do Supabase:**
   - Vá em **Logs** → **Postgres Logs**
   - Procure por erros relacionados a `profiles`, `chats`, `chat_participants`

3. **Teste diretamente no SQL Editor:**
   - Execute as queries acima
   - Verifique se os dados existem
   - Verifique se as inserções funcionam

4. **Recrie o perfil:**
```sql
-- Deletar e recriar perfil (CUIDADO: isso apaga dados do perfil)
DELETE FROM public.profiles WHERE id = auth.uid();

-- Recriar
INSERT INTO public.profiles (id, nickname, avatar_url)
VALUES (
  auth.uid(),
  'novo_nickname',
  'https://i.pravatar.cc/150?u=' || auth.uid()
);
```

---

**Última atualização:** 2026-02-12
