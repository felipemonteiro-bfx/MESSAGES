-- ============================================
-- Trigger para criar perfil automaticamente ao criar usuário
-- Execute no SQL Editor do Supabase
-- ============================================

-- Função que cria o perfil quando um usuário é criado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'nickname',
      'user_' || substring(NEW.id::text from 1 for 8)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      'https://i.pravatar.cc/150?u=' || NEW.id
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que executa a função após INSERT em auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Comentário: Este trigger garante que sempre que um usuário é criado (via signup ou OAuth),
-- um perfil é criado automaticamente na tabela profiles.
