import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  // Sempre redirecionar para portal (/) após callback
  const next = requestUrl.searchParams.get('next') ?? '/';
  
  // Usar o host do request para garantir a porta correta
  const host = request.headers.get('host');
  const protocol = requestUrl.protocol;
  const origin = `${protocol}//${host}`;

  if (code) {
    const supabase = await createClient();
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && session?.user) {
      // Ensure profile exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .single();

      if (!profile) {
        await supabase.from('profiles').insert({
          id: session.user.id,
          nickname: session.user.user_metadata.nickname || `user_${session.user.id.slice(0, 5)}`,
          avatar_url: session.user.user_metadata.avatar_url || `https://i.pravatar.cc/150?u=${session.user.id}`,
        });
      }

      logger.info('User authenticated via callback', {
        userId: session.user.id,
      });
      // Sempre redirecionar para portal (/) - não para /login
      return NextResponse.redirect(`${origin}/`);
    }
    logger.error('Failed to exchange code for session', error as Error);
  } else {
    logger.warn('No authentication code provided in callback');
  }

  // Se der erro, redireciona para portal (não para /login)
  return NextResponse.redirect(`${origin}/`);
}