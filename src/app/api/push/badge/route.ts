import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isApnsConfigured, sendApns } from '@/lib/apns';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
    }

    if (!isApnsConfigured()) {
      return NextResponse.json({ ok: true });
    }

    const { data: tokens } = await getSupabaseAdmin()
      .from('push_tokens')
      .select('token')
      .eq('user_id', user.id)
      .eq('platform', 'ios');

    if (tokens?.length) {
      const deviceTokens = tokens.map((t: { token: string }) => t.token);
      await sendApns(deviceTokens, {
        title: '',
        body: '',
        badge: 0,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error('Erro ao limpar badge', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ message: 'Erro ao limpar badge' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
    }

    const { data: participations } = await getSupabaseAdmin()
      .from('chat_participants')
      .select('chat_id')
      .eq('user_id', user.id);

    if (!participations?.length) {
      return NextResponse.json({ count: 0 });
    }

    const chatIds = participations.map((p: { chat_id: string }) => p.chat_id);
    
    const { count } = await getSupabaseAdmin()
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .in('chat_id', chatIds)
      .neq('sender_id', user.id)
      .is('read_at', null);

    return NextResponse.json({ count: count || 0 });
  } catch (error) {
    logger.error('Erro ao obter contagem de badge', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ message: 'Erro ao obter contagem' }, { status: 500 });
  }
}
