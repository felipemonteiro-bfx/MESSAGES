-- Messaging App Schema (Stealth Mode)
-- IDEMPOTENTE: pode ser executado várias vezes sem erro (tabelas/policies já existentes são ignoradas ou recriadas)

-- 1. Profiles (Public user info)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid references auth.users not null primary key,
  nickname text unique not null,
  avatar_url text,
  status text,
  last_seen timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

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

-- 2. Chats (Conversations)
CREATE TABLE IF NOT EXISTS public.chats (
  id uuid default gen_random_uuid() primary key,
  type text default 'private' check (type in ('private', 'group')),
  name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- 3. Chat Participants (Join table)
CREATE TABLE IF NOT EXISTS public.chat_participants (
  chat_id uuid references public.chats on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text default 'member',
  muted boolean default false,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (chat_id, user_id)
);

-- Adicionar coluna muted se tabela já existir
DO $$ BEGIN
  ALTER TABLE public.chat_participants ADD COLUMN IF NOT EXISTS muted boolean DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view chats they are part of" ON public.chat_participants;
CREATE POLICY "Users can view chats they are part of"
  ON public.chat_participants FOR SELECT
  USING ( auth.uid() = user_id );

DROP POLICY IF EXISTS "Users can view other participants in their chats" ON public.chat_participants;
CREATE POLICY "Users can view other participants in their chats"
  ON public.chat_participants FOR SELECT
  USING (
    chat_id IN (
      SELECT chat_id 
      FROM public.chat_participants 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert participants" ON public.chat_participants;
CREATE POLICY "Users can insert participants"
  ON public.chat_participants FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

DROP POLICY IF EXISTS "Users can view chats they belong to" ON public.chats;
CREATE POLICY "Users can view chats they belong to"
  ON public.chats FOR SELECT
  USING (
    exists (
      select 1 from public.chat_participants cp
      where cp.chat_id = public.chats.id
      and cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert chats" ON public.chats;
CREATE POLICY "Users can insert chats"
  ON public.chats FOR INSERT
  WITH CHECK ( true );

-- 4. Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid default gen_random_uuid() primary key,
  chat_id uuid references public.chats on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete set null,
  content text,
  media_url text,
  media_type text,
  is_encrypted boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages in their chats" ON public.messages;
CREATE POLICY "Users can view messages in their chats"
  ON public.messages FOR SELECT
  USING (
    exists (
      select 1 from public.chat_participants cp
      where cp.chat_id = messages.chat_id
      and cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can send messages to their chats" ON public.messages;
CREATE POLICY "Users can send messages to their chats"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    and exists (
      select 1 from public.chat_participants cp
      where cp.chat_id = messages.chat_id
      and cp.user_id = auth.uid()
    )
  );

-- Storage for Media
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Participants can view media" ON storage.objects;
CREATE POLICY "Participants can view media"
  ON storage.objects FOR SELECT
  USING (
     bucket_id = 'chat-media'
     and auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
CREATE POLICY "Authenticated users can upload media"
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id = 'chat-media' and auth.role() = 'authenticated' );

-- Função para atualizar nickname
CREATE OR REPLACE FUNCTION update_user_nickname(
  target_user_id UUID,
  new_nickname TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF length(new_nickname) < 3 OR length(new_nickname) > 20 THEN
    RAISE EXCEPTION 'Nickname deve ter entre 3 e 20 caracteres';
  END IF;
  IF NOT (new_nickname ~ '^[a-z0-9_]+$') THEN
    RAISE EXCEPTION 'Nickname deve conter apenas letras minúsculas, números e underscore';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE nickname = new_nickname AND id != target_user_id) THEN
    RAISE EXCEPTION 'Nickname já está em uso';
  END IF;
  UPDATE public.profiles SET nickname = new_nickname WHERE id = target_user_id;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION update_user_nickname(UUID, TEXT) TO authenticated;

-- Função para buscar usuário por email (case-insensitive)
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
  SELECT u.id INTO user_id
  FROM auth.users u
  WHERE LOWER(u.email) = LOWER(user_email)
  LIMIT 1;
  IF user_id IS NULL THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT p.id, p.nickname, p.avatar_url, p.status, p.last_seen, p.created_at
  FROM public.profiles p
  WHERE p.id = user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_by_email(TEXT) TO authenticated;
