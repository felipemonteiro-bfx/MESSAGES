/**
 * POST /api/push/subscribe-native
 * Registra token de push nativo (APNs/FCM) para iOS/Android.
 * Requer autenticação.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const token = body?.token as string | undefined;
    const platform = (body?.platform as string) || 'ios';

    if (!token || typeof token !== 'string' || token.length < 10) {
      return NextResponse.json(
        { message: 'Token inválido' },
        { status: 400 }
      );
    }

    const { data: existing } = await supabase
      .from('push_tokens')
      .select('id')
      .eq('user_id', user.id)
      .eq('token', token)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ ok: true });
    }

    const { error } = await supabase.from('push_tokens').insert({
      user_id: user.id,
      token,
      platform: platform === 'android' ? 'android' : 'ios',
    });

    if (error) {
      return NextResponse.json(
        { message: error.message || 'Erro ao salvar token' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Error in POST /api/push/subscribe-native:', e);
    return NextResponse.json(
      { message: 'Erro ao salvar inscrição' },
      { status: 500 }
    );
  }
}
