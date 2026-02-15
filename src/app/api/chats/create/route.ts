import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

// Server-side API to create a new chat
// Uses service role to bypass RLS issues

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export async function POST(request: NextRequest) {
  try {
    // Authenticate the user
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { recipientNickname, type = 'private' } = body;

    if (!recipientNickname || typeof recipientNickname !== 'string') {
      return NextResponse.json({ error: 'recipientNickname is required' }, { status: 400 });
    }

    // Find the recipient by nickname
    const { data: recipient, error: recipientError } = await supabaseAdmin
      .from('profiles')
      .select('id, nickname')
      .eq('nickname', recipientNickname.trim())
      .maybeSingle();

    if (recipientError || !recipient) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    if (recipient.id === user.id) {
      return NextResponse.json({ error: 'Você não pode iniciar um chat consigo mesmo' }, { status: 400 });
    }

    // Check if a private chat already exists between these users
    if (type === 'private') {
      const { data: existingChats } = await supabaseAdmin
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', user.id);

      if (existingChats && existingChats.length > 0) {
        const chatIds = existingChats.map(c => c.chat_id);
        
        const { data: recipientChats } = await supabaseAdmin
          .from('chat_participants')
          .select('chat_id')
          .eq('user_id', recipient.id)
          .in('chat_id', chatIds);

        if (recipientChats && recipientChats.length > 0) {
          // Check if any of these are private chats
          const commonChatIds = recipientChats.map(c => c.chat_id);
          const { data: privateChats } = await supabaseAdmin
            .from('chats')
            .select('id')
            .in('id', commonChatIds)
            .eq('type', 'private')
            .limit(1);

          if (privateChats && privateChats.length > 0) {
            return NextResponse.json({ 
              chatId: privateChats[0].id,
              existing: true,
              message: 'Chat já existe' 
            });
          }
        }
      }
    }

    // Create the chat
    const { data: chat, error: chatError } = await supabaseAdmin
      .from('chats')
      .insert({ type })
      .select('id')
      .single();

    if (chatError || !chat) {
      console.error('Error creating chat:', chatError);
      return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 });
    }

    // Add both participants
    const { error: participantsError } = await supabaseAdmin
      .from('chat_participants')
      .insert([
        { chat_id: chat.id, user_id: user.id },
        { chat_id: chat.id, user_id: recipient.id },
      ]);

    if (participantsError) {
      console.error('Error adding participants:', participantsError);
      // Cleanup: delete the chat
      await supabaseAdmin.from('chats').delete().eq('id', chat.id);
      return NextResponse.json({ error: 'Failed to add participants' }, { status: 500 });
    }

    return NextResponse.json({ 
      chatId: chat.id,
      existing: false,
      message: 'Chat criado com sucesso' 
    });
  } catch (err) {
    console.error('Unexpected error in /api/chats/create:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
