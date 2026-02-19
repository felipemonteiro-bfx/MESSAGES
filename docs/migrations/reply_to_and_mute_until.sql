-- Migração: reply_to_id em messages + mute_until em chat_participants
-- Execute no SQL Editor do Supabase

-- 1. reply_to_id para respostas citadas
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON public.messages(reply_to_id);

-- 2. mute_until para silenciar por período (granular)
ALTER TABLE public.chat_participants
  ADD COLUMN IF NOT EXISTS mute_until timestamptz;
