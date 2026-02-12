-- ============================================
-- Verificação rápida do Supabase (stealth-messaging)
-- Execute no SQL Editor para conferir se tudo foi criado
-- ============================================

-- 1. Tabelas existem?
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'chats', 'chat_participants', 'messages', 'push_subscriptions')
ORDER BY table_name;

-- 2. Contagem de registros
SELECT 'profiles' AS tabela, COUNT(*) AS registros FROM public.profiles
UNION ALL SELECT 'chats', COUNT(*) FROM public.chats
UNION ALL SELECT 'chat_participants', COUNT(*) FROM public.chat_participants
UNION ALL SELECT 'messages', COUNT(*) FROM public.messages
UNION ALL SELECT 'push_subscriptions', COUNT(*) FROM public.push_subscriptions;

-- 3. Trigger on_auth_user_created existe?
SELECT tgname, tgrelid::regclass 
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- 4. Funções existem?
SELECT proname AS funcao 
FROM pg_proc 
WHERE proname IN ('get_user_by_email', 'update_user_nickname', 'handle_new_user', 'cleanup_expired_messages')
ORDER BY proname;

-- 5. Bucket chat-media existe?
SELECT id, name, public FROM storage.buckets WHERE id = 'chat-media';
