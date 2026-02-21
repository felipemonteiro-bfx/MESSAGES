import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { getSupabaseAdmin, getApiErrorMessage } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { messageIds } = body;

    if (!Array.isArray(messageIds) || messageIds.length === 0 || messageIds.length > 100) {
      return NextResponse.json({ error: 'messageIds must be an array of 1-100 IDs' }, { status: 400 });
    }

    const { data, error } = await getSupabaseAdmin()
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .in('id', messageIds)
      .neq('sender_id', user.id)
      .is('read_at', null)
      .select('id');

    if (error) {
      console.error('Error marking messages as read:', error);
      return NextResponse.json({ error: 'Failed to mark messages as read' }, { status: 500 });
    }

    return NextResponse.json({ updated: data?.length ?? 0 });
  } catch (err) {
    console.error('Unexpected error in PATCH /api/messages/read:', err);
    return NextResponse.json({ error: getApiErrorMessage(err) }, { status: 500 });
  }
}
