import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { getSupabaseAdmin, getApiErrorMessage } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// POST /api/messages/view - Mark a view-once message as viewed
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { messageId } = body;

    if (!messageId) {
      return NextResponse.json({ error: 'messageId is required' }, { status: 400 });
    }

    // Verify message exists, is view-once, and not yet viewed
    const { data: message, error: fetchError } = await getSupabaseAdmin()
      .from('messages')
      .select('id, chat_id, sender_id, is_view_once, viewed_at')
      .eq('id', messageId)
      .maybeSingle();

    if (fetchError || !message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (!message.is_view_once) {
      return NextResponse.json({ error: 'Message is not view-once' }, { status: 400 });
    }

    if (message.viewed_at) {
      return NextResponse.json({ error: 'Message already viewed' }, { status: 400 });
    }

    // Only recipient can mark as viewed (not the sender)
    if (message.sender_id === user.id) {
      return NextResponse.json({ error: 'Sender cannot mark their own message as viewed' }, { status: 400 });
    }

    // Verify user is participant
    const { data: participation, error: partError } = await getSupabaseAdmin()
      .from('chat_participants')
      .select('user_id')
      .eq('chat_id', message.chat_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (partError || !participation) {
      return NextResponse.json({ error: 'Not a participant of this chat' }, { status: 403 });
    }

    // Mark as viewed
    const { data: updatedMessage, error: updateError } = await getSupabaseAdmin()
      .from('messages')
      .update({ viewed_at: new Date().toISOString() })
      .eq('id', messageId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error marking message as viewed:', updateError);
      return NextResponse.json({ error: 'Failed to mark message as viewed' }, { status: 500 });
    }

    return NextResponse.json({ message: updatedMessage });
  } catch (err) {
    console.error('Unexpected error in POST /api/messages/view:', err);
    return NextResponse.json({ error: getApiErrorMessage(err) }, { status: 500 });
  }
}
