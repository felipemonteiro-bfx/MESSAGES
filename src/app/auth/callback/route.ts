import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-static';
export const revalidate = 0;

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/';

  // Usar origin da URL do request (confiável) em vez do header Host (spoofável)
  const origin = requestUrl.origin;

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
        const { error: profileError } = await supabase.from('profiles').insert({
          id: session.user.id,
          nickname: session.user.user_metadata.nickname || `user_${session.user.id.slice(0, 5)}`,
          avatar_url: session.user.user_metadata.avatar_url || `https://i.pravatar.cc/150?u=${session.user.id}`,
        });

        if (profileError) {
          logger.error('Failed to create profile in callback', profileError);
        }
      }

      logger.info('User authenticated via callback', {
        userId: session.user.id,
      });

      // Validar next para evitar open redirect
      const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
    logger.error('Failed to exchange code for session', error as Error);
  } else {
    logger.warn('No authentication code provided in callback');
  }

  return NextResponse.redirect(`${origin}/`);
}
