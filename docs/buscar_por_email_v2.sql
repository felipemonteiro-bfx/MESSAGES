-- Função para buscar usuário por email - VERSÃO CORRIGIDA
-- Execute este SQL no Supabase SQL Editor para habilitar busca por email

-- Primeiro, vamos verificar se a função já existe e removê-la se necessário
DROP FUNCTION IF EXISTS get_user_by_email(TEXT);

-- Criar função para buscar usuário por email (retorna profile)
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
  -- Buscar ID do usuário pelo email na tabela auth.users
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = user_email
  LIMIT 1;
  
  -- Se não encontrou, retornar vazio
  IF user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Retornar o profile correspondente
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

-- Dar permissão para todos os usuários autenticados usarem a função
GRANT EXECUTE ON FUNCTION get_user_by_email(TEXT) TO authenticated;

-- Verificar se a função foi criada corretamente
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_result(oid) as return_type
FROM pg_proc
WHERE proname = 'get_user_by_email';

-- Teste 1: Verificar se existem usuários no auth.users
SELECT id, email, created_at 
FROM auth.users 
LIMIT 5;

-- Teste 2: Verificar se existem profiles
SELECT id, nickname, created_at 
FROM public.profiles 
LIMIT 5;

-- Teste 3: Testar a função (substitua pelo email real do seu usuário)
-- SELECT * FROM get_user_by_email('teste@stealth.com');
