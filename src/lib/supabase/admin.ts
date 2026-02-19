import { createClient, SupabaseClient } from '@supabase/supabase-js';

function getEnvError(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) {
    return 'NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_URL não configurada. Configure em Vercel → Settings → Environment Variables e faça Redeploy.';
  }
  if (!key) {
    return 'SUPABASE_SERVICE_ROLE_KEY não configurada. Obtenha em Supabase → Settings → API → service_role e adicione em Vercel → Settings → Environment Variables. Depois faça Redeploy.';
  }
  return '';
}

export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const err = getEnvError();
  if (err) throw new Error(err);
  return createClient(url!, key!, {
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
