-- ============================================================
-- MIGRAÇÕES COMPLETAS - Sistema de Chat Stealth
-- Execute este arquivo no SQL Editor do Supabase Dashboard
-- https://supabase.com/dashboard/project/moaxyoqjedgrfnxeskku/sql/new
-- ============================================================

-- ============================================================
-- 1. DUAL PIN / MODO PÂNICO
-- Adiciona suporte para conversas "decoy" (falsas)
-- ============================================================

-- Adicionar coluna is_decoy na tabela chats
ALTER TABLE public.chats 
ADD COLUMN IF NOT EXISTS is_decoy BOOLEAN DEFAULT false;

-- Índice para filtrar chats por modo
CREATE INDEX IF NOT EXISTS idx_chats_is_decoy ON public.chats(is_decoy);

-- Adicionar coluna is_decoy na tabela messages
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS is_decoy BOOLEAN DEFAULT false;

-- Índice para filtrar mensagens por modo
CREATE INDEX IF NOT EXISTS idx_messages_is_decoy ON public.messages(is_decoy);

-- Comentários
COMMENT ON COLUMN public.chats.is_decoy IS 'Se true, esta conversa é exibida apenas no modo pânico (decoy)';
COMMENT ON COLUMN public.messages.is_decoy IS 'Se true, esta mensagem foi criada no modo pânico (decoy)';

-- ============================================================
-- 2. EDIÇÃO E EXCLUSÃO DE MENSAGENS
-- Adiciona suporte para editar e excluir mensagens
-- ============================================================

-- Adicionar coluna edited_at para tracking de edições
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ DEFAULT NULL;

-- Adicionar coluna deleted_at para soft delete
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Adicionar coluna deleted_for_everyone
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS deleted_for_everyone BOOLEAN DEFAULT false;

-- Adicionar coluna original_content para histórico
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS original_content TEXT DEFAULT NULL;

-- Índices
CREATE INDEX IF NOT EXISTS idx_messages_edited_at ON public.messages(edited_at) WHERE edited_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON public.messages(deleted_at) WHERE deleted_at IS NOT NULL;

-- Comentários
COMMENT ON COLUMN public.messages.edited_at IS 'Timestamp da última edição (NULL se nunca editada)';
COMMENT ON COLUMN public.messages.deleted_at IS 'Timestamp da exclusão (soft delete)';
COMMENT ON COLUMN public.messages.deleted_for_everyone IS 'Se true, mensagem foi apagada para todos';
COMMENT ON COLUMN public.messages.original_content IS 'Conteúdo original antes da primeira edição';

-- ============================================================
-- 3. VIEW ONCE MESSAGES
-- Mensagens que só podem ser visualizadas uma vez
-- ============================================================

-- Adicionar coluna is_view_once
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS is_view_once BOOLEAN DEFAULT false;

-- Adicionar coluna viewed_at
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ DEFAULT NULL;

-- Índice para queries de mensagens view-once
CREATE INDEX IF NOT EXISTS idx_messages_view_once ON public.messages(is_view_once, viewed_at) 
WHERE is_view_once = true;

-- Comentários
COMMENT ON COLUMN public.messages.is_view_once IS 'Se true, mensagem só pode ser visualizada uma vez';
COMMENT ON COLUMN public.messages.viewed_at IS 'Timestamp de quando mensagem view-once foi visualizada';

-- ============================================================
-- 4. REAÇÕES COM EMOJI
-- Tabela e políticas para reações em mensagens
-- ============================================================

-- Tabela de reações
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON public.message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON public.message_reactions(user_id);

-- RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes (para evitar duplicação)
DROP POLICY IF EXISTS "Users can view reactions in their chats" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can add reactions in their chats" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can remove their own reactions" ON public.message_reactions;

-- Política: ver reações
CREATE POLICY "Users can view reactions in their chats"
  ON public.message_reactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.chat_participants cp ON cp.chat_id = m.chat_id
      WHERE m.id = message_reactions.message_id
        AND cp.user_id = auth.uid()
    )
  );

-- Política: adicionar reações
CREATE POLICY "Users can add reactions in their chats"
  ON public.message_reactions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.chat_participants cp ON cp.chat_id = m.chat_id
      WHERE m.id = message_reactions.message_id
        AND cp.user_id = auth.uid()
    )
  );

-- Política: remover reações
CREATE POLICY "Users can remove their own reactions"
  ON public.message_reactions
  FOR DELETE
  USING (user_id = auth.uid());

-- Comentário
COMMENT ON TABLE public.message_reactions IS 'Reações com emoji nas mensagens. Emojis: 👍 ❤️ 😂 😮 😢 😡';

-- ============================================================
-- 5. FUNÇÕES AUXILIARES
-- Funções para verificar permissões de edição/exclusão
-- ============================================================

-- Função: verificar se pode editar (15 minutos)
CREATE OR REPLACE FUNCTION can_edit_message(message_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  msg_sender_id UUID;
  msg_created_at TIMESTAMPTZ;
BEGIN
  SELECT sender_id, created_at INTO msg_sender_id, msg_created_at
  FROM public.messages
  WHERE id = message_id AND deleted_at IS NULL;
  
  IF msg_sender_id IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN msg_sender_id = p_user_id AND msg_created_at > NOW() - INTERVAL '15 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: verificar se pode excluir para todos (1 hora)
CREATE OR REPLACE FUNCTION can_delete_for_everyone(message_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  msg_sender_id UUID;
  msg_created_at TIMESTAMPTZ;
BEGIN
  SELECT sender_id, created_at INTO msg_sender_id, msg_created_at
  FROM public.messages
  WHERE id = message_id AND deleted_at IS NULL;
  
  IF msg_sender_id IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN msg_sender_id = p_user_id AND msg_created_at > NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: obter contagem de reações
CREATE OR REPLACE FUNCTION get_reaction_counts(msg_id UUID)
RETURNS TABLE(emoji TEXT, count BIGINT, user_reacted BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mr.emoji,
    COUNT(*)::BIGINT as count,
    BOOL_OR(mr.user_id = auth.uid()) as user_reacted
  FROM public.message_reactions mr
  WHERE mr.message_id = msg_id
  GROUP BY mr.emoji
  ORDER BY count DESC, mr.emoji;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: criar chat decoy de exemplo
CREATE OR REPLACE FUNCTION create_sample_decoy_chat(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  chat_uuid UUID;
BEGIN
  INSERT INTO public.chats (type, name, is_decoy)
  VALUES ('private', 'Família', true)
  RETURNING id INTO chat_uuid;
  
  INSERT INTO public.chat_participants (chat_id, user_id, role)
  VALUES (chat_uuid, p_user_id, 'admin');
  
  INSERT INTO public.messages (chat_id, sender_id, content, is_decoy, created_at)
  VALUES 
    (chat_uuid, p_user_id, 'Oi, tudo bem?', true, NOW() - INTERVAL '2 hours'),
    (chat_uuid, p_user_id, 'Vou chegar mais tarde hoje', true, NOW() - INTERVAL '1 hour'),
    (chat_uuid, p_user_id, 'Ok, até mais!', true, NOW() - INTERVAL '30 minutes');
  
  RETURN chat_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- MIGRAÇÃO CONCLUÍDA!
-- ============================================================
-- Tabelas modificadas:
--   - public.chats (is_decoy)
--   - public.messages (is_decoy, edited_at, deleted_at, deleted_for_everyone, 
--                      original_content, is_view_once, viewed_at)
--
-- Tabelas criadas:
--   - public.message_reactions
--
-- Funções criadas:
--   - can_edit_message(message_id, user_id)
--   - can_delete_for_everyone(message_id, user_id)
--   - get_reaction_counts(message_id)
--   - create_sample_decoy_chat(user_id)
-- ============================================================

SELECT 'Migrações aplicadas com sucesso!' as status;
