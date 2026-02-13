-- Adicionar campo muted em chat_participants (Sugestão 12: Notificações silenciosas)
ALTER TABLE public.chat_participants 
ADD COLUMN IF NOT EXISTS muted BOOLEAN DEFAULT false;

-- Adicionar campo public_key em profiles (Sugestão 2: Criptografia E2E)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS public_key TEXT;

-- Comentários
COMMENT ON COLUMN public.chat_participants.muted IS 'Se true, usuário não recebe notificações desta conversa';
COMMENT ON COLUMN public.profiles.public_key IS 'Chave pública RSA para criptografia E2E (base64)';
