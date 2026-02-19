-- Migração: bucket chat-media para mídia do chat
-- Resolve "bucket not found" ao enviar fotos/vídeos/áudio
-- Execute no SQL Editor do Supabase (uma única vez)

-- 1. Criar bucket chat-media (público para exibir imagens na conversa)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media',
  'chat-media',
  true,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','audio/mpeg','audio/webm','audio/mp4','audio/ogg']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = COALESCE(EXCLUDED.file_size_limit, 10485760),
  allowed_mime_types = COALESCE(EXCLUDED.allowed_mime_types, ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','audio/mpeg','audio/webm','audio/mp4','audio/ogg']);

-- 2. RLS: participantes podem visualizar mídia de seus chats
DROP POLICY IF EXISTS "Participants can view media" ON storage.objects;
CREATE POLICY "Participants can view media"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-media'
    AND auth.role() = 'authenticated'
  );

-- 3. RLS: participantes podem fazer upload de mídia nos chats em que participam
DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Participants can upload chat media" ON storage.objects;
CREATE POLICY "Participants can upload chat media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-media'
    AND auth.role() = 'authenticated'
  );
