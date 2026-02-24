import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { getSupabaseAdmin, getApiErrorMessage } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * POST /api/messages/read-by-chat — marca todas as mensagens não lidas do chat como lidas.
 * Body: { chatId: string }
 * Usado ao abrir a conversa para zerar o badge imediatamente, sem depender da lista de mensagens carregada.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const chatId = typeof body.chatId === 'string' ? body.chatId.trim() : '';

    if (!chatId) {
      return NextResponse.json({ error: 'chatId is required' }, { status: 400 });
    }

    const { data, error } = await getSupabaseAdmin()
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('chat_id', chatId)
      .neq('sender_id', user.id)
      .is('read_at', null)
      .select('id');

    if (error) {
      console.error('Error marking messages as read by chat:', error);
      return NextResponse.json({ error: 'Failed to mark messages as read' }, { status: 500 });
    }

    return NextResponse.json({ updated: data?.length ?? 0 });
  } catch (err) {
    console.error('Unexpected error in POST /api/messages/read-by-chat:', err);
    return NextResponse.json({ error: getApiErrorMessage(err) }, { status: 500 });
  }
}
