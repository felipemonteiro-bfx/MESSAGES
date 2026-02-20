import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { getSupabaseAdmin, getApiErrorMessage } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const ALLOWED_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏', '🎉', '💯'];

// GET /api/messages/reactions?messageId=xxx - Get reactions for a message
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const messageId = request.nextUrl.searchParams.get('messageId');
    if (!messageId) {
      return NextResponse.json({ error: 'messageId is required' }, { status: 400 });
    }

    // Get reactions with counts
    const { data: reactions, error } = await getSupabaseAdmin()
      .from('message_reactions')
      .select('emoji, user_id')
      .eq('message_id', messageId);

    if (error) {
      console.error('Error fetching reactions:', error);
      return NextResponse.json({ error: 'Failed to fetch reactions' }, { status: 500 });
    }

    // Group by emoji and count
    const reactionCounts: Record<string, { count: number; userReacted: boolean }> = {};
    for (const reaction of reactions || []) {
      if (!reactionCounts[reaction.emoji]) {
        reactionCounts[reaction.emoji] = { count: 0, userReacted: false };
      }
      reactionCounts[reaction.emoji].count++;
      if (reaction.user_id === user.id) {
        reactionCounts[reaction.emoji].userReacted = true;
      }
    }

    return NextResponse.json({ reactions: reactionCounts });
  } catch (err) {
    console.error('Unexpected error in GET /api/messages/reactions:', err);
    return NextResponse.json({ error: getApiErrorMessage(err) }, { status: 500 });
  }
}

// POST /api/messages/reactions - Add a reaction
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { messageId, emoji } = body;

    if (!messageId || !emoji) {
      return NextResponse.json({ error: 'messageId and emoji are required' }, { status: 400 });
    }

    if (!ALLOWED_EMOJIS.includes(emoji)) {
      return NextResponse.json({ error: 'Invalid emoji' }, { status: 400 });
    }

    // Verify message exists and user is participant
    const { data: message, error: msgError } = await getSupabaseAdmin()
      .from('messages')
      .select('id, chat_id')
      .eq('id', messageId)
      .maybeSingle();

    if (msgError || !message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const { data: participation, error: partError } = await getSupabaseAdmin()
      .from('chat_participants')
      .select('user_id')
      .eq('chat_id', message.chat_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (partError || !participation) {
      return NextResponse.json({ error: 'Not a participant of this chat' }, { status: 403 });
    }

    // Add reaction (upsert to handle duplicates gracefully)
    const { data: reaction, error: insertError } = await getSupabaseAdmin()
      .from('message_reactions')
      .upsert({
        message_id: messageId,
        user_id: user.id,
        emoji,
      }, {
        onConflict: 'message_id,user_id,emoji'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error adding reaction:', insertError);
      return NextResponse.json({ error: 'Failed to add reaction' }, { status: 500 });
    }

    return NextResponse.json({ reaction });
  } catch (err) {
    console.error('Unexpected error in POST /api/messages/reactions:', err);
    return NextResponse.json({ error: getApiErrorMessage(err) }, { status: 500 });
  }
}

// DELETE /api/messages/reactions - Remove a reaction
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');
    const emoji = searchParams.get('emoji');

    if (!messageId || !emoji) {
      return NextResponse.json({ error: 'messageId and emoji are required' }, { status: 400 });
    }

    const { error: deleteError } = await getSupabaseAdmin()
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji);

    if (deleteError) {
      console.error('Error removing reaction:', deleteError);
      return NextResponse.json({ error: 'Failed to remove reaction' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Unexpected error in DELETE /api/messages/reactions:', err);
    return NextResponse.json({ error: getApiErrorMessage(err) }, { status: 500 });
  }
}
