-- Script para criar um usuário de teste no Supabase
-- Execute este script no SQL Editor do Supabase

-- 1. Criar usuário de teste (substitua o email e senha)
-- O usuário será criado na tabela auth.users automaticamente quando fizer signup
-- Mas você pode criar manualmente assim:

-- Primeiro, crie o usuário via Auth UI do Supabase ou use este script:

-- Inserir usuário de teste na tabela auth.users
-- NOTA: Em produção, use a interface de Auth do Supabase para criar usuários
-- Este é apenas para desenvolvimento/teste

-- Opção 1: Criar via Supabase Auth UI (Recomendado)
-- 1. Vá em Authentication > Users
-- 2. Clique em "Add user"
-- 3. Preencha:
--    Email: teste@stealth.com
--    Password: Teste123456
--    Auto Confirm User: ✅ SIM

-- Opção 2: Criar perfil manualmente após criar usuário via Auth UI
-- Execute após criar o usuário via Auth UI:

-- Substitua 'USER_ID_AQUI' pelo ID do usuário criado
-- Você pode encontrar o ID em Authentication > Users após criar

INSERT INTO public.profiles (id, nickname, avatar_url, status, created_at)
VALUES (
  'USER_ID_AQUI', -- Substitua pelo ID do usuário criado
  'usuario_teste', -- Nickname de teste
  'https://i.pravatar.cc/150?img=1',
  'online',
  now()
)
ON CONFLICT (id) DO UPDATE SET nickname = 'usuario_teste';

-- Para facilitar, aqui está um script que cria um usuário completo:
-- (Execute no SQL Editor do Supabase)

-- Criar função helper para criar usuário de teste
CREATE OR REPLACE FUNCTION create_test_user(
  test_email TEXT DEFAULT 'teste@stealth.com',
  test_password TEXT DEFAULT 'Teste123456',
  test_nickname TEXT DEFAULT 'usuario_teste'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Criar usuário na auth.users (requer extensão)
  -- NOTA: Isso só funciona se você tiver permissões de admin
  -- Em produção, use a API do Supabase Auth
  
  -- Por enquanto, retorne instruções:
  RAISE NOTICE 'Para criar usuário de teste:';
  RAISE NOTICE '1. Vá em Authentication > Users no Supabase';
  RAISE NOTICE '2. Clique em "Add user"';
  RAISE NOTICE '3. Email: %', test_email;
  RAISE NOTICE '4. Password: %', test_password;
  RAISE NOTICE '5. Auto Confirm User: SIM';
  RAISE NOTICE '6. Depois execute o INSERT abaixo com o ID do usuário criado';
  
  RETURN NULL;
END;
$$;

-- Função para atualizar nickname de qualquer usuário (para admins)
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

-- Dar permissão para todos os usuários autenticados usarem a função
GRANT EXECUTE ON FUNCTION update_user_nickname(UUID, TEXT) TO authenticated;
