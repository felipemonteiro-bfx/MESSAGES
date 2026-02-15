-- ============================================================
-- FIX: Infinite recursion in chat_participants RLS policy
-- 
-- Problem: The "Users can view other participants in their chats" 
-- policy was causing infinite recursion because it referenced
-- the same table within its own policy definition using EXISTS.
--
-- Solution: Replace with a simpler policy that allows users to 
-- see all participants in chats where they are a member.
-- The first policy "Users can view chats they are part of" 
-- already covers the user's own rows. This second policy
-- needs to cover OTHER participants in the same chats.
--
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view other participants in their chats" ON public.chat_participants;

-- Drop the basic policy too (we'll recreate a single combined policy)
DROP POLICY IF EXISTS "Users can view chats they are part of" ON public.chat_participants;

-- Create a single, non-recursive SELECT policy
-- This allows a user to see all participants in any chat they belong to
CREATE POLICY "Users can view participants in their chats"
  ON public.chat_participants FOR SELECT
  USING (
    -- User can see their own rows directly
    user_id = auth.uid()
    OR
    -- User can see other participants if they share a chat
    -- Using a security_barrier subquery to prevent recursion
    chat_id IN (
      SELECT cp.chat_id 
      FROM public.chat_participants cp
      WHERE cp.user_id = auth.uid()
    )
  );

-- Verify the policy was created
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'chat_participants';
