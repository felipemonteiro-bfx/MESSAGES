-- Migration: Message Reactions
-- Adiciona suporte para reações com emoji em mensagens

-- Tabela de reações
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Único: um usuário só pode adicionar um tipo de emoji por mensagem
  UNIQUE(message_id, user_id, emoji)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON public.message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON public.message_reactions(user_id);

-- RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Políticas: usuários autenticados podem ver reações de mensagens em chats que participam
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

-- Políticas: usuários podem adicionar reações em mensagens de chats que participam
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

-- Políticas: usuários podem remover suas próprias reações
CREATE POLICY "Users can remove their own reactions"
  ON public.message_reactions
  FOR DELETE
  USING (user_id = auth.uid());

-- Função para obter contagem de reações por mensagem
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

-- Emojis padrão sugeridos
COMMENT ON TABLE public.message_reactions IS 'Reações com emoji nas mensagens. Emojis comuns: 👍 ❤️ 😂 😮 😢 🙏 🔥 👏';
