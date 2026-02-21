import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { getSupabaseAdmin, getApiErrorMessage } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Authenticate the user via their session
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    
    // Get access mode from query params (main or decoy)
    const { searchParams } = new URL(request.url);
    const accessMode = searchParams.get('mode') || 'main';
    const isDecoyMode = accessMode === 'decoy';

    // 1. Get user's chat participations (using admin to bypass RLS)
    const { data: myParticipations, error: partError } = await getSupabaseAdmin()
      .from('chat_participants')
      .select('chat_id, muted, mute_until')
      .eq('user_id', userId);

    if (partError) {
      console.error('Error fetching participations:', partError);
      return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 });
    }

    if (!myParticipations || myParticipations.length === 0) {
      return NextResponse.json({ chats: [] });
    }

    const chatIds = myParticipations.map(p => p.chat_id);

    // 2. Get chat details (filtered by access mode)
    const { data: chats, error: chatsError } = await getSupabaseAdmin()
      .from('chats')
      .select('id, type, name, is_decoy')
      .in('id', chatIds)
      .eq('is_decoy', isDecoyMode);

    if (chatsError) {
      console.error('Error fetching chats:', chatsError);
      return NextResponse.json({ error: 'Failed to fetch chat details' }, { status: 500 });
    }

    // 3. Get other participants for all chats (batch query)
    const { data: allParticipants, error: allPartError } = await getSupabaseAdmin()
      .from('chat_participants')
      .select('chat_id, user_id')
      .in('chat_id', chatIds)
      .neq('user_id', userId);

    if (allPartError) {
      console.error('Error fetching other participants:', allPartError);
    }

    // 4. Get profiles for other participants
    const otherUserIds = [...new Set((allParticipants || []).map(p => p.user_id))];
    let profilesMap: Record<string, { id: string; nickname: string; avatar_url: string | null; public_key: string | null }> = {};

    if (otherUserIds.length > 0) {
      const { data: profiles, error: profilesError } = await getSupabaseAdmin()
        .from('profiles')
        .select('id, nickname, avatar_url, public_key')
        .in('id', otherUserIds);

      if (!profilesError && profiles) {
        profilesMap = Object.fromEntries(profiles.map(p => [p.id, p]));
      }
    }

    // 5. Get last messages for all chats (one query per chat with LIMIT 1)
    const lastMessageMap: Record<string, { content: string; created_at: string; is_encrypted?: boolean; media_type?: string | null }> = {};
    const unreadCountMap: Record<string, number> = {};
    const lastMsgPromises = chatIds.map(async (chatId) => {
      const { data, error } = await getSupabaseAdmin()
        .from('messages')
        .select('chat_id, content, created_at, is_encrypted, media_type')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (!error && data) {
        lastMessageMap[data.chat_id] = {
          content: data.content,
          created_at: data.created_at,
          is_encrypted: data.is_encrypted ?? false,
          media_type: data.media_type ?? null,
        };
      }
    });

    const unreadPromises = chatIds.map(async (chatId) => {
      const { count, error } = await getSupabaseAdmin()
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('chat_id', chatId)
        .neq('sender_id', userId)
        .is('read_at', null);
      if (!error && count !== null) {
        unreadCountMap[chatId] = count;
      }
    });

    await Promise.all([...lastMsgPromises, ...unreadPromises]);

    const now = new Date().toISOString();
    const mutedMap = Object.fromEntries(
      myParticipations.map((p: { chat_id: string; muted?: boolean; mute_until?: string | null }) => [
        p.chat_id,
        !!(p.muted && (!p.mute_until || p.mute_until > now)),
      ])
    );
    const participantByChatMap: Record<string, string> = {};
    if (allParticipants) {
      for (const p of allParticipants) {
        if (!participantByChatMap[p.chat_id]) {
          participantByChatMap[p.chat_id] = p.user_id;
        }
      }
    }

    const result = (chats || []).map(chat => {
      const otherUserId = participantByChatMap[chat.id];
      const otherProfile = otherUserId ? profilesMap[otherUserId] : null;
      const lastMsg = lastMessageMap[chat.id];

      return {
        id: chat.id,
        type: chat.type,
        name: chat.name || undefined,
        muted: mutedMap[chat.id] || false,
        is_decoy: chat.is_decoy || false,
        recipient: otherProfile ? {
          id: otherProfile.id,
          nickname: otherProfile.nickname,
          avatar_url: otherProfile.avatar_url || '',
          public_key: otherProfile.public_key || null,
        } : undefined,
        lastMessage: lastMsg?.content || undefined,
        lastMessageEncrypted: lastMsg?.is_encrypted || false,
        lastMessageMediaType: lastMsg?.media_type || undefined,
        time: lastMsg?.created_at || undefined,
        unreadCount: unreadCountMap[chat.id] || 0,
      };
    });

    // Sort by last message time (most recent first)
    result.sort((a, b) => {
      const timeA = a.time ? new Date(a.time).getTime() : 0;
      const timeB = b.time ? new Date(b.time).getTime() : 0;
      return timeB - timeA;
    });

    return NextResponse.json({ chats: result });
  } catch (err) {
    console.error('Unexpected error in /api/chats:', err);
    return NextResponse.json({ error: getApiErrorMessage(err) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = await request.json();
    if (!chatId) {
      return NextResponse.json({ error: 'chatId is required' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    const { data: participation } = await admin
      .from('chat_participants')
      .select('chat_id')
      .eq('chat_id', chatId)
      .eq('user_id', user.id)
      .single();

    if (!participation) {
      return NextResponse.json({ error: 'Chat not found or not authorized' }, { status: 403 });
    }

    await admin.from('messages').delete().eq('chat_id', chatId);
    await admin.from('chat_participants').delete().eq('chat_id', chatId);
    await admin.from('chats').delete().eq('id', chatId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error deleting chat:', err);
    return NextResponse.json({ error: getApiErrorMessage(err) }, { status: 500 });
  }
}
