-- Migration: Edit and Delete Messages
-- Adiciona suporte para edição e exclusão de mensagens

-- Adicionar coluna edited_at para tracking de edições
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ DEFAULT NULL;

-- Adicionar coluna deleted_at para soft delete
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Adicionar coluna deleted_for_everyone (true = apagada para todos, false = só para o remetente)
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS deleted_for_everyone BOOLEAN DEFAULT false;

-- Adicionar coluna original_content para histórico de edições (opcional)
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS original_content TEXT DEFAULT NULL;

-- Índices para otimizar queries
CREATE INDEX IF NOT EXISTS idx_messages_edited_at ON public.messages(edited_at) WHERE edited_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON public.messages(deleted_at) WHERE deleted_at IS NOT NULL;

-- Função para verificar se mensagem pode ser editada (limite de 15 minutos)
CREATE OR REPLACE FUNCTION can_edit_message(message_id UUID, user_id UUID)
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
  
  -- Verificar se é o remetente e se está dentro do limite de 15 minutos
  RETURN msg_sender_id = user_id AND msg_created_at > NOW() - INTERVAL '15 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se mensagem pode ser excluída para todos (limite de 1 hora)
CREATE OR REPLACE FUNCTION can_delete_for_everyone(message_id UUID, user_id UUID)
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
  
  -- Verificar se é o remetente e se está dentro do limite de 1 hora
  RETURN msg_sender_id = user_id AND msg_created_at > NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários
COMMENT ON COLUMN public.messages.edited_at IS 'Timestamp da última edição (NULL se nunca editada)';
COMMENT ON COLUMN public.messages.deleted_at IS 'Timestamp da exclusão (soft delete)';
COMMENT ON COLUMN public.messages.deleted_for_everyone IS 'Se true, mensagem foi apagada para todos os participantes';
COMMENT ON COLUMN public.messages.original_content IS 'Conteúdo original antes da primeira edição';
