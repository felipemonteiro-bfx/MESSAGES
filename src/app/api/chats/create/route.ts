import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { getSupabaseAdmin, getApiErrorMessage } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    // Authenticate the user
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { recipientNickname, recipientId, type = 'private' } = body;

    let recipient: { id: string; nickname: string } | null = null;

    if (recipientId && typeof recipientId === 'string') {
      // Buscar por ID (mais confiável)
      const { data: profile, error: idError } = await getSupabaseAdmin()
        .from('profiles')
        .select('id, nickname')
        .eq('id', recipientId)
        .maybeSingle();

      if (idError || !profile) {
        return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
      }
      recipient = profile;
    } else if (recipientNickname && typeof recipientNickname === 'string') {
      // Fallback: buscar por nickname
      const escaped = (recipientNickname as string).trim().replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
      const { data: profile, error: recipientError } = await getSupabaseAdmin()
        .from('profiles')
        .select('id, nickname')
        .ilike('nickname', escaped)
        .maybeSingle();

      if (recipientError || !profile) {
        return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
      }
      recipient = profile;
    } else {
      return NextResponse.json(
        { error: 'recipientId ou recipientNickname é obrigatório' },
        { status: 400 }
      );
    }

    if (recipient.id === user.id) {
      return NextResponse.json({ error: 'Você não pode iniciar um chat consigo mesmo' }, { status: 400 });
    }

    // Garantir que o usuário atual tenha perfil (FK em chat_participants exige)
    const admin = getSupabaseAdmin();
    const { data: myProfile } = await admin.from('profiles').select('id').eq('id', user.id).maybeSingle();
    if (!myProfile) {
      return NextResponse.json(
        { error: 'Seu perfil ainda não foi criado. Atualize a página e tente novamente.' },
        { status: 400 }
      );
    }

    // Check if a private chat already exists between these users
    if (type === 'private') {
      const { data: existingChats } = await admin
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', user.id);

      if (existingChats && existingChats.length > 0) {
        const chatIds = existingChats.map(c => c.chat_id);
        
        const { data: recipientChats } = await admin
          .from('chat_participants')
          .select('chat_id')
          .eq('user_id', recipient.id)
          .in('chat_id', chatIds);

        if (recipientChats && recipientChats.length > 0) {
          // Check if any of these are private chats
          const commonChatIds = recipientChats.map(c => c.chat_id);
          const { data: privateChats } = await admin
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
    const { data: chat, error: chatError } = await admin
      .from('chats')
      .insert({ type })
      .select('id')
      .single();

    if (chatError || !chat) {
      console.error('Error creating chat:', chatError);
      return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 });
    }

    // Add both participants (ambos precisam existir em profiles por causa do FK)
    const { error: participantsError } = await admin
      .from('chat_participants')
      .insert([
        { chat_id: chat.id, user_id: user.id },
        { chat_id: chat.id, user_id: recipient.id },
      ]);

    if (participantsError) {
      console.error('Error adding participants:', participantsError);
      const code = participantsError?.code || '';
      const msg = participantsError?.message || '';
      // Cleanup: delete the chat
      await admin.from('chats').delete().eq('id', chat.id);
      if (code === '23503' || msg.includes('foreign key') || msg.includes('violates foreign key')) {
        return NextResponse.json(
          { error: 'Um dos usuários não possui perfil. Peça ao outro usuário para concluir o cadastro.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: msg || 'Erro ao adicionar participantes' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      chatId: chat.id,
      existing: false,
      message: 'Chat criado com sucesso' 
    });
  } catch (err) {
    console.error('Unexpected error in /api/chats/create:', err);
    return NextResponse.json({ error: getApiErrorMessage(err) }, { status: 500 });
  }
}
