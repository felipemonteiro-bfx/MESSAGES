import { createClient, SupabaseClient } from '@supabase/supabase-js';

const ENV_ERROR =
  'SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_URL não configuradas. Configure em Vercel → Settings → Environment Variables e faça Redeploy.';

export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(ENV_ERROR);
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Mensagem de erro amigável para respostas de API (mostra detalhe em dev ou quando é erro de env) */
export function getApiErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('SUPABASE_SERVICE_ROLE_KEY') || msg.includes('NEXT_PUBLIC_SUPABASE_URL')) {
    return msg;
  }
  return process.env.NODE_ENV === 'development' ? msg : 'Erro no servidor. Tente novamente.';
}
