import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

// Server-side API to fetch and send messages
// Uses service role to bypass RLS recursion on chat_participants

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

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
    const { data: participation } = await supabaseAdmin
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

    const { data: messages, error: msgError } = await supabaseAdmin
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
    const { chatId, content, mediaUrl, mediaType, expiresAt, isEphemeral } = body;

    if (!chatId || !content) {
      return NextResponse.json({ error: 'chatId and content are required' }, { status: 400 });
    }

    if (typeof content !== 'string' || content.length > 10000) {
      return NextResponse.json({ error: 'Invalid content' }, { status: 400 });
    }

    // Verify user is a participant of this chat
    const { data: participation } = await supabaseAdmin
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

    // Colunas opcionais que existem na tabela
    if (mediaUrl) insertData.media_url = mediaUrl;
    if (mediaType) insertData.media_type = mediaType;
    // Nota: expires_at e is_ephemeral podem não existir na tabela ainda
    // Só incluir se tiverem valor real (não null/false/undefined)

    const { data: message, error: msgError } = await supabaseAdmin
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
