-- Migração: permitir UPDATE em chat_participants para alterar notificações (muted, mute_until)
-- Necessário para o menu "Silenciar" / "Ativar notificações" na conversa
-- Execute no SQL Editor do Supabase

DROP POLICY IF EXISTS "Users can update own participation" ON public.chat_participants;
CREATE POLICY "Users can update own participation"
  ON public.chat_participants FOR UPDATE
  USING ( auth.uid() = user_id )
  WITH CHECK ( auth.uid() = user_id );
