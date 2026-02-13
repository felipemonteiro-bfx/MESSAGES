-- Retenção mínima de 10 dias para mensagens e mídia
-- Execute no SQL Editor do Supabase
-- Garante que mensagens, fotos, vídeos e textos sejam mantidos por pelo menos 10 dias

-- Atualizar função de limpeza para respeitar retenção mínima de 10 dias
CREATE OR REPLACE FUNCTION cleanup_expired_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Deletar apenas mensagens efêmeras que:
  -- 1. Têm expires_at definido (são efêmeras)
  -- 2. Já expiraram (expires_at < NOW())
  -- 3. Foram criadas há mais de 10 dias (retenção mínima garantida)
  DELETE FROM public.messages
  WHERE expires_at IS NOT NULL 
    AND expires_at < NOW()
    AND created_at < NOW() - INTERVAL '10 days';
END;
$$;

-- Comentário explicativo
COMMENT ON FUNCTION cleanup_expired_messages() IS 
'Remove mensagens efêmeras expiradas, mas garante retenção mínima de 10 dias para todas as mensagens. Mensagens regulares (sem expires_at) nunca são deletadas por esta função.';

-- Nota: Para execução automática, configure um cron job no Supabase:
-- SELECT cron.schedule(
--   'cleanup-expired-messages',
--   '0 2 * * *', -- Executa diariamente às 2h da manhã
--   $$ SELECT cleanup_expired_messages(); $$
-- );

-- Verificar mensagens que serão mantidas (exemplo de query)
-- SELECT 
--   id,
--   content,
--   expires_at,
--   created_at,
--   CASE 
--     WHEN expires_at IS NULL THEN 'Mensagem regular (mantida indefinidamente)'
--     WHEN expires_at < NOW() AND created_at >= NOW() - INTERVAL '10 days' THEN 'Efêmera expirada mas dentro do período de retenção (10 dias)'
--     WHEN expires_at < NOW() AND created_at < NOW() - INTERVAL '10 days' THEN 'Efêmera expirada e fora do período de retenção (será deletada)'
--     ELSE 'Efêmera ainda válida'
--   END as status
-- FROM public.messages
-- ORDER BY created_at DESC
-- LIMIT 20;
