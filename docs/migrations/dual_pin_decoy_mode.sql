-- Migration: Dual PIN / Decoy Mode Support
-- Adiciona suporte para conversas "decoy" (falsas) para o modo pânico

-- Adicionar coluna is_decoy na tabela chats
ALTER TABLE public.chats 
ADD COLUMN IF NOT EXISTS is_decoy BOOLEAN DEFAULT false;

-- Índice para filtrar chats por modo
CREATE INDEX IF NOT EXISTS idx_chats_is_decoy ON public.chats(is_decoy);

-- Adicionar coluna is_decoy na tabela messages (para mensagens criadas no modo decoy)
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS is_decoy BOOLEAN DEFAULT false;

-- Índice para filtrar mensagens por modo
CREATE INDEX IF NOT EXISTS idx_messages_is_decoy ON public.messages(is_decoy);

-- Função para criar uma conversa decoy de exemplo
CREATE OR REPLACE FUNCTION create_sample_decoy_chat(user_id UUID)
RETURNS UUID AS $$
DECLARE
  chat_uuid UUID;
BEGIN
  -- Criar chat decoy
  INSERT INTO public.chats (type, name, is_decoy)
  VALUES ('private', 'Família', true)
  RETURNING id INTO chat_uuid;
  
  -- Adicionar usuário como participante
  INSERT INTO public.chat_participants (chat_id, user_id, role)
  VALUES (chat_uuid, user_id, 'admin');
  
  -- Adicionar algumas mensagens decoy de exemplo
  INSERT INTO public.messages (chat_id, sender_id, content, is_decoy, created_at)
  VALUES 
    (chat_uuid, user_id, 'Oi, tudo bem?', true, NOW() - INTERVAL '2 hours'),
    (chat_uuid, user_id, 'Vou chegar mais tarde hoje', true, NOW() - INTERVAL '1 hour'),
    (chat_uuid, user_id, 'Ok, até mais!', true, NOW() - INTERVAL '30 minutes');
  
  RETURN chat_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários
COMMENT ON COLUMN public.chats.is_decoy IS 'Se true, esta conversa é exibida apenas no modo pânico (decoy)';
COMMENT ON COLUMN public.messages.is_decoy IS 'Se true, esta mensagem foi criada no modo pânico (decoy)';
