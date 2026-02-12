-- Sugestão 4: Adicionar suporte a mensagens efêmeras
-- Execute este SQL no Supabase SQL Editor

-- Adicionar colunas para mensagens efêmeras
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_ephemeral BOOLEAN DEFAULT false;

-- Criar índice para melhorar performance na busca de mensagens expiradas
CREATE INDEX IF NOT EXISTS idx_messages_expires_at ON public.messages(expires_at) 
WHERE expires_at IS NOT NULL;

-- Função para limpar mensagens expiradas automaticamente
CREATE OR REPLACE FUNCTION cleanup_expired_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.messages
  WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
END;
$$;

-- Agendar limpeza automática (executar manualmente ou via cron)
-- Nota: Para execução automática, configure um cron job no Supabase
-- ou execute periodicamente via API

COMMENT ON COLUMN public.messages.expires_at IS 'Data/hora em que a mensagem expira (para mensagens efêmeras)';
COMMENT ON COLUMN public.messages.is_ephemeral IS 'Indica se a mensagem é efêmera (some após ser lida ou após expires_at)';
