-- Migration: View Once Messages
-- Mensagens que só podem ser visualizadas uma vez

-- Adicionar coluna is_view_once para marcar mensagens "ver uma vez"
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS is_view_once BOOLEAN DEFAULT false;

-- Adicionar coluna viewed_at para registrar quando foi visualizada
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ DEFAULT NULL;

-- Índice para queries de mensagens view-once não visualizadas
CREATE INDEX IF NOT EXISTS idx_messages_view_once ON public.messages(is_view_once, viewed_at) 
WHERE is_view_once = true;

-- Comentários
COMMENT ON COLUMN public.messages.is_view_once IS 'Se true, mensagem só pode ser visualizada uma vez';
COMMENT ON COLUMN public.messages.viewed_at IS 'Timestamp de quando mensagem view-once foi visualizada';
