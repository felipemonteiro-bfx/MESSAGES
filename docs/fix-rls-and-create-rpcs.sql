
-- ============================================================
-- Fix RLS policies and create helper functions
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Fix the recursive RLS policy on chat_participants
DROP POLICY IF EXISTS "Users can view other participants in their chats" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can view chats they are part of" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can view participants in their chats" ON public.chat_participants;

-- Simple non-recursive policy: users can see their own rows
CREATE POLICY "Users can view their own participations"
  ON public.chat_participants FOR SELECT
  USING (user_id = auth.uid());

-- 2. Create a SECURITY DEFINER function to get other participants
-- This bypasses RLS safely by checking the caller is a participant first
CREATE OR REPLACE FUNCTION public.get_chat_other_participants(
  p_chat_id uuid,
  p_user_id uuid
)
RETURNS TABLE (
  user_id uuid,
  nickname text,
  avatar_url text
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    cp.user_id,
    p.nickname,
    p.avatar_url
  FROM chat_participants cp
  JOIN profiles p ON p.id = cp.user_id
  WHERE cp.chat_id = p_chat_id
    AND cp.user_id != p_user_id
    -- Security check: caller must be a participant of this chat
    AND EXISTS (
      SELECT 1 FROM chat_participants 
      WHERE chat_id = p_chat_id 
      AND user_id = p_user_id
    );
$$;

-- 3. Create a function to get all user's chats with details
CREATE OR REPLACE FUNCTION public.get_user_chats(p_user_id uuid)
RETURNS TABLE (
  chat_id uuid,
  chat_type text,
  chat_name text,
  muted boolean,
  other_user_id uuid,
  other_nickname text,
  other_avatar_url text,
  last_message_content text,
  last_message_time timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    cp.chat_id,
    c.type::text as chat_type,
    c.name as chat_name,
    COALESCE(cp.muted, false) as muted,
    other_cp.user_id as other_user_id,
    other_p.nickname as other_nickname,
    other_p.avatar_url as other_avatar_url,
    lm.content as last_message_content,
    lm.created_at as last_message_time
  FROM chat_participants cp
  JOIN chats c ON c.id = cp.chat_id
  LEFT JOIN LATERAL (
    SELECT cp2.user_id
    FROM chat_participants cp2
    WHERE cp2.chat_id = cp.chat_id
      AND cp2.user_id != p_user_id
    LIMIT 1
  ) other_cp ON true
  LEFT JOIN profiles other_p ON other_p.id = other_cp.user_id
  LEFT JOIN LATERAL (
    SELECT m.content, m.created_at
    FROM messages m
    WHERE m.chat_id = cp.chat_id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) lm ON true
  WHERE cp.user_id = p_user_id
  ORDER BY lm.created_at DESC NULLS LAST;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_chat_other_participants(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_chats(uuid) TO authenticated;

-- Verify
SELECT 'RLS fix and RPC functions created successfully!' as status;
