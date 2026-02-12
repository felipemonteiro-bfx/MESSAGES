# 👤 Como Criar Usuário de Teste

## Método 1: Via Interface do Supabase (Recomendado)

1. **Acesse o Supabase Dashboard:**
   - Vá em: https://supabase.com/dashboard
   - Selecione seu projeto: `moaxyoqjedgrfnxeskku`

2. **Criar Usuário:**
   - Vá em **Authentication** > **Users**
   - Clique em **"Add user"** (ou **"Invite user"**)
   - Preencha:
     ```
     Email: teste@stealth.com
     Password: Teste123456
     Auto Confirm User: ✅ SIM (muito importante!)
     ```
   - Clique em **"Create user"**

3. **Copiar o User ID:**
   - Após criar, você verá o usuário na lista
   - Clique no usuário para ver os detalhes
   - **Copie o User ID** (UUID)

4. **Criar Perfil:**
   - Vá em **SQL Editor**
   - Execute este SQL (substitua `USER_ID_AQUI` pelo ID copiado):

```sql
INSERT INTO public.profiles (id, nickname, avatar_url, status, created_at)
VALUES (
  'USER_ID_AQUI', -- Cole o User ID aqui
  'usuario_teste', -- Nickname de teste
  'https://i.pravatar.cc/150?img=1',
  'online',
  now()
)
ON CONFLICT (id) DO UPDATE SET nickname = 'usuario_teste';
```

5. **Pronto!** O usuário está criado com:
   - **Email**: `teste@stealth.com`
   - **Senha**: `Teste123456`
   - **Nickname**: `usuario_teste`

## Método 2: Via Signup no App

1. **Acesse o app:**
   - http://localhost:3005

2. **Criar conta:**
   - Clique em "Fale Conosco" ou duplo clique na data/hora
   - Configure um PIN
   - No sistema de mensagens, você precisará criar um perfil primeiro
   - O sistema criará automaticamente o perfil quando você usar pela primeira vez

## ⚠️ Importante

- O nickname deve ser único
- O nickname deve ter entre 3 e 20 caracteres
- Apenas letras minúsculas, números e underscore são permitidos
- Exemplo válido: `usuario_teste`, `teste123`, `admin_user`

## 🔧 Função SQL para Editar Nicknames de Outros

Execute este SQL no Supabase para permitir editar nicknames de outros usuários:

```sql
-- Função para atualizar nickname de qualquer usuário
CREATE OR REPLACE FUNCTION update_user_nickname(
  target_user_id UUID,
  new_nickname TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validar nickname
  IF length(new_nickname) < 3 OR length(new_nickname) > 20 THEN
    RAISE EXCEPTION 'Nickname deve ter entre 3 e 20 caracteres';
  END IF;
  
  IF NOT (new_nickname ~ '^[a-z0-9_]+$') THEN
    RAISE EXCEPTION 'Nickname deve conter apenas letras minúsculas, números e underscore';
  END IF;
  
  -- Verificar se nickname já existe
  IF EXISTS (SELECT 1 FROM public.profiles WHERE nickname = new_nickname AND id != target_user_id) THEN
    RAISE EXCEPTION 'Nickname já está em uso';
  END IF;
  
  -- Atualizar nickname
  UPDATE public.profiles
  SET nickname = new_nickname
  WHERE id = target_user_id;
  
  RETURN FOUND;
END;
$$;

-- Dar permissão para todos os usuários autenticados
GRANT EXECUTE ON FUNCTION update_user_nickname(UUID, TEXT) TO authenticated;
```

## 📝 Credenciais do Usuário de Teste

Após criar, você terá:

**Email**: `teste@stealth.com`  
**Senha**: `Teste123456`  
**Nickname**: `usuario_teste`

Use essas credenciais para fazer login e testar o sistema!
