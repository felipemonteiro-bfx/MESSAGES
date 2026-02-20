import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { getSupabaseAdmin, getApiErrorMessage } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/messages?chatId=xxx&page=1&limit=50
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const chatId = request.nextUrl.searchParams.get('chatId');
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');

    if (!chatId) {
      return NextResponse.json({ error: 'chatId is required' }, { status: 400 });
    }

    // Verify user is a participant of this chat
    const { data: participation } = await getSupabaseAdmin()
      .from('chat_participants')
      .select('chat_id')
      .eq('chat_id', chatId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!participation) {
      return NextResponse.json({ error: 'Not a participant of this chat' }, { status: 403 });
    }

    // Fetch messages
    const from = (page - 1) * limit;
    const to = page * limit - 1;

    const { data: messages, error: msgError } = await getSupabaseAdmin()
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (msgError) {
      console.error('Error fetching messages:', msgError);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    return NextResponse.json({ 
      messages: messages || [],
      hasMore: (messages || []).length === limit
    });
  } catch (err) {
    console.error('Unexpected error in GET /api/messages:', err);
    return NextResponse.json({ error: getApiErrorMessage(err) }, { status: 500 });
  }
}

// POST /api/messages
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { chatId, content, mediaUrl, mediaType, expiresAt, isEphemeral, replyToId, isViewOnce } = body;

    if (!chatId || !content) {
      return NextResponse.json({ error: 'chatId and content are required' }, { status: 400 });
    }

    if (typeof content !== 'string' || content.length > 10000) {
      return NextResponse.json({ error: 'Invalid content' }, { status: 400 });
    }

    // Verify user is a participant of this chat
    const { data: participation } = await getSupabaseAdmin()
      .from('chat_participants')
      .select('chat_id')
      .eq('chat_id', chatId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!participation) {
      return NextResponse.json({ error: 'Not a participant of this chat' }, { status: 403 });
    }

    // Insert message (only include columns that exist in the table)
    const insertData: Record<string, unknown> = {
      chat_id: chatId,
      sender_id: user.id,
      content,
    };

    // Colunas opcionais
    if (mediaUrl) insertData.media_url = mediaUrl;
    if (mediaType) insertData.media_type = mediaType;
    if (replyToId && typeof replyToId === 'string') insertData.reply_to_id = replyToId;
    if (isViewOnce === true) insertData.is_view_once = true;

    const { data: message, error: msgError } = await getSupabaseAdmin()
      .from('messages')
      .insert(insertData)
      .select('*')
      .single();

    if (msgError) {
      console.error('Error sending message:', msgError);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    return NextResponse.json({ message });
  } catch (err) {
    console.error('Unexpected error in POST /api/messages:', err);
    return NextResponse.json({ error: getApiErrorMessage(err) }, { status: 500 });
  }
}

// PATCH /api/messages - Edit a message
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { messageId, content } = body;

    if (!messageId || !content) {
      return NextResponse.json({ error: 'messageId and content are required' }, { status: 400 });
    }

    if (typeof content !== 'string' || content.length > 10000) {
      return NextResponse.json({ error: 'Invalid content' }, { status: 400 });
    }

    // Verify message exists and belongs to user
    const { data: existingMessage, error: fetchError } = await getSupabaseAdmin()
      .from('messages')
      .select('id, sender_id, content, created_at, deleted_at, original_content')
      .eq('id', messageId)
      .maybeSingle();

    if (fetchError || !existingMessage) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (existingMessage.sender_id !== user.id) {
      return NextResponse.json({ error: 'You can only edit your own messages' }, { status: 403 });
    }

    if (existingMessage.deleted_at) {
      return NextResponse.json({ error: 'Cannot edit deleted message' }, { status: 400 });
    }

    // Check 15-minute limit
    const createdAt = new Date(existingMessage.created_at);
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (createdAt < fifteenMinutesAgo) {
      return NextResponse.json({ error: 'Mensagens só podem ser editadas até 15 minutos após o envio' }, { status: 400 });
    }

    // Store original content if first edit
    const updateData: Record<string, unknown> = {
      content,
      edited_at: new Date().toISOString(),
    };

    if (!existingMessage.original_content) {
      updateData.original_content = existingMessage.content;
    }

    const { data: updatedMessage, error: updateError } = await getSupabaseAdmin()
      .from('messages')
      .update(updateData)
      .eq('id', messageId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating message:', updateError);
      return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
    }

    return NextResponse.json({ message: updatedMessage });
  } catch (err) {
    console.error('Unexpected error in PATCH /api/messages:', err);
    return NextResponse.json({ error: getApiErrorMessage(err) }, { status: 500 });
  }
}

// DELETE /api/messages - Delete a message (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');
    const forEveryone = searchParams.get('forEveryone') === 'true';

    if (!messageId) {
      return NextResponse.json({ error: 'messageId is required' }, { status: 400 });
    }

    // Verify message exists and belongs to user
    const { data: existingMessage, error: fetchError } = await getSupabaseAdmin()
      .from('messages')
      .select('id, sender_id, created_at, deleted_at, content')
      .eq('id', messageId)
      .maybeSingle();

    if (fetchError || !existingMessage) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (existingMessage.sender_id !== user.id) {
      return NextResponse.json({ error: 'You can only delete your own messages' }, { status: 403 });
    }

    if (existingMessage.deleted_at) {
      return NextResponse.json({ error: 'Message already deleted' }, { status: 400 });
    }

    // If deleting for everyone, check 1-hour limit
    if (forEveryone) {
      const createdAt = new Date(existingMessage.created_at);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (createdAt < oneHourAgo) {
        return NextResponse.json({ error: 'Mensagens só podem ser apagadas para todos até 1 hora após o envio' }, { status: 400 });
      }
    }

    const { data: deletedMessage, error: deleteError } = await getSupabaseAdmin()
      .from('messages')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_for_everyone: forEveryone,
        content: forEveryone ? '' : existingMessage.content,
      })
      .eq('id', messageId)
      .select('*')
      .single();

    if (deleteError) {
      console.error('Error deleting message:', deleteError);
      return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: deletedMessage,
      deletedForEveryone: forEveryone 
    });
  } catch (err) {
    console.error('Unexpected error in DELETE /api/messages:', err);
    return NextResponse.json({ error: getApiErrorMessage(err) }, { status: 500 });
  }
}
