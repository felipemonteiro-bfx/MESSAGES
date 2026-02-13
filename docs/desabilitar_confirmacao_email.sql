-- Desabilitar confirmação de email no Supabase
-- Execute no SQL Editor do Supabase
-- Isso permite que qualquer email seja aceito sem validação

-- IMPORTANTE: Esta configuração deve ser feita no Dashboard do Supabase:
-- 1. Authentication → Settings → Email Auth
-- 2. Desmarque "Enable email confirmations"
-- 3. Salve as alterações

-- Alternativamente, você pode usar a API do Supabase Management:
-- UPDATE auth.config SET enable_signup = true, enable_email_confirmations = false;

-- Nota: A confirmação de email é uma configuração do Supabase Auth,
-- não pode ser desabilitada apenas via SQL. Use o Dashboard ou Management API.

-- Para verificar a configuração atual:
-- SELECT * FROM auth.config WHERE key = 'enable_email_confirmations';

-- Se você tem acesso ao Supabase Management API, pode usar:
/*
curl -X PATCH 'https://api.supabase.com/v1/projects/{project_id}/config/auth' \
  -H 'Authorization: Bearer {management_api_token}' \
  -H 'Content-Type: application/json' \
  -d '{
    "ENABLE_SIGNUP": true,
    "ENABLE_EMAIL_CONFIRMATIONS": false
  }'
*/

-- IMPORTANTE: A forma mais fácil é pelo Dashboard:
-- Supabase Dashboard → Authentication → Settings → Email Auth
-- Desmarque "Enable email confirmations" e salve
