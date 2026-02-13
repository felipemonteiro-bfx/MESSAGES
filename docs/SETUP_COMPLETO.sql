
-- ============================================
-- 1. PROFILES (Informações públicas dos usuários)
-- ============================================

-- Criar tabela profiles se não existir
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  nickname TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  status TEXT,
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies para profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING ( true );

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING ( auth.uid() = id );

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK ( auth.uid() = id );

-- ============================================
-- 2. CHATS (Conversas)
-- ============================================

CREATE TABLE IF NOT EXISTS public.chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT DEFAULT 'private' CHECK (type IN ('private', 'group')),
  name TEXT, -- Para grupos
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. CHAT PARTICIPANTS (Participantes das conversas)
-- ============================================

CREATE TABLE IF NOT EXISTS public.chat_participants (
  chat_id UUID REFERENCES public.chats ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (chat_id, user_id)
);

ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view chats they are part of" ON public.chat_participants;
CREATE POLICY "Users can view chats they are part of"
  ON public.chat_participants FOR SELECT
  USING ( auth.uid() = user_id );

DROP POLICY IF EXISTS "Users can view other participants in their chats" ON public.chat_participants;
CREATE POLICY "Users can view other participants in their chats"
  ON public.chat_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.chat_id = chat_participants.chat_id
      AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert participants" ON public.chat_participants;
CREATE POLICY "Users can insert participants"
  ON public.chat_participants FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

-- Policies para Chats
DROP POLICY IF EXISTS "Users can view chats they belong to" ON public.chats;
CREATE POLICY "Users can view chats they belong to"
  ON public.chats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.chat_id = id
      AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert chats" ON public.chats;
CREATE POLICY "Users can insert chats"
  ON public.chats FOR INSERT
  WITH CHECK ( true );

-- ============================================
-- 4. MESSAGES (Mensagens)
-- ============================================

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID REFERENCES public.chats ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content TEXT, -- Conteúdo de texto
  media_url TEXT, -- Para imagens/vídeo/áudio
  media_type TEXT, -- 'image', 'video', 'audio'
  read_at TIMESTAMPTZ, -- Quando foi lida
  is_encrypted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages in their chats" ON public.messages;
CREATE POLICY "Users can view messages in their chats"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.chat_id = messages.chat_id
      AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can send messages to their chats" ON public.messages;
CREATE POLICY "Users can send messages to their chats"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.chat_id = messages.chat_id
      AND cp.user_id = auth.uid()
    )
  );

-- ============================================
-- 5. STORAGE BUCKET (Para mídia)
-- ============================================

INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-media', 'chat-media', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Participants can view media" ON storage.objects;
CREATE POLICY "Participants can view media"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-media' 
    AND auth.role() = 'authenticated' 
  );

DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
CREATE POLICY "Authenticated users can upload media"
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id = 'chat-media' AND auth.role() = 'authenticated' );

-- ============================================
-- 6. FUNÇÕES
-- ============================================

-- Função para atualizar nickname de qualquer usuário
DROP FUNCTION IF EXISTS update_user_nickname(UUID, TEXT);
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

GRANT EXECUTE ON FUNCTION update_user_nickname(UUID, TEXT) TO authenticated;

-- Função para buscar usuário por email
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
  -- Buscar ID do usuário pelo email na tabela auth.users
  SELECT id INTO user_id
  FROM auth.users
  WHERE LOWER(email) = LOWER(user_email)
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

GRANT EXECUTE ON FUNCTION get_user_by_email(TEXT) TO authenticated;

-- ============================================
-- 7. VERIFICAÇÕES
-- ============================================

-- Verificar se tabelas foram criadas
SELECT 
  'profiles' as tabela,
  COUNT(*) as registros
FROM public.profiles
UNION ALL
SELECT 
  'chats',
  COUNT(*)
FROM public.chats
UNION ALL
SELECT 
  'chat_participants',
  COUNT(*)
FROM public.chat_participants
UNION ALL
SELECT 
  'messages',
  COUNT(*)
FROM public.messages;

-- Verificar se funções foram criadas
SELECT 
  proname as funcao,
  pg_get_function_arguments(oid) as argumentos
FROM pg_proc
WHERE proname IN ('get_user_by_email', 'update_user_nickname')
ORDER BY proname;

-- Listar usuários disponíveis
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC
LIMIT 10;

-- Listar profiles disponíveis
SELECT p.id, p.nickname, u.email, p.created_at
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
ORDER BY p.created_at DESC
LIMIT 10;
