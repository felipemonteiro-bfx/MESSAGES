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

    // 2. Get chat details
    const { data: chats, error: chatsError } = await getSupabaseAdmin()
      .from('chats')
      .select('id, type, name')
      .in('id', chatIds);

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
    let profilesMap: Record<string, { id: string; nickname: string; avatar_url: string | null }> = {};

    if (otherUserIds.length > 0) {
      const { data: profiles, error: profilesError } = await getSupabaseAdmin()
        .from('profiles')
        .select('id, nickname, avatar_url')
        .in('id', otherUserIds);

      if (!profilesError && profiles) {
        profilesMap = Object.fromEntries(profiles.map(p => [p.id, p]));
      }
    }

    // 5. Get last messages for all chats (batch query)
    // Use a single query with DISTINCT ON to get the latest message per chat
    const { data: lastMessages, error: msgError } = await getSupabaseAdmin()
      .from('messages')
      .select('chat_id, content, created_at')
      .in('chat_id', chatIds)
      .order('created_at', { ascending: false });

    // Group by chat_id and take the first (most recent) message
    const lastMessageMap: Record<string, { content: string; created_at: string }> = {};
    if (!msgError && lastMessages) {
      for (const msg of lastMessages) {
        if (!lastMessageMap[msg.chat_id]) {
          lastMessageMap[msg.chat_id] = { content: msg.content, created_at: msg.created_at };
        }
      }
    }

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
        recipient: otherProfile ? {
          id: otherProfile.id,
          nickname: otherProfile.nickname,
          avatar_url: otherProfile.avatar_url || '',
        } : undefined,
        lastMessage: lastMsg?.content || undefined,
        time: lastMsg?.created_at || undefined,
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
