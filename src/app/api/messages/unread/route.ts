import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// GET /api/messages/unread — lightweight endpoint for checking unread messages
// Returns up to 5 most recent unread messages across all chats
export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ unread: [] }, { status: 200 });
    }

    // Get user's chat IDs
    const { data: participations } = await supabaseAdmin
      .from('chat_participants')
      .select('chat_id')
      .eq('user_id', user.id);

    if (!participations || participations.length === 0) {
      return NextResponse.json({ unread: [] });
    }

    const chatIds = participations.map(p => p.chat_id);

    // Fetch unread messages not sent by this user
    const { data: unread } = await supabaseAdmin
      .from('messages')
      .select('id, content, sender_id, chat_id, created_at')
      .in('chat_id', chatIds)
      .neq('sender_id', user.id)
      .is('read_at', null)
      .order('created_at', { ascending: false })
      .limit(5);

    // Get sender nicknames
    const senderIds = [...new Set((unread || []).map(m => m.sender_id))];
    let profiles: Record<string, string> = {};

    if (senderIds.length > 0) {
      const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('id, nickname')
        .in('id', senderIds);

      if (profileData) {
        profiles = Object.fromEntries(profileData.map(p => [p.id, p.nickname]));
      }
    }

    const result = (unread || []).map(msg => ({
      id: msg.id,
      chatId: msg.chat_id,
      senderId: msg.sender_id,
      senderNickname: profiles[msg.sender_id] || 'Contato',
      content: msg.content,
      createdAt: msg.created_at,
    }));

    return NextResponse.json({ unread: result });
  } catch (err) {
    console.error('Error in GET /api/messages/unread:', err);
    return NextResponse.json({ unread: [] });
  }
}
