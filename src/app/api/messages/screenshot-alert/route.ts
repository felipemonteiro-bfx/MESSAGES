import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * POST - Notifica que um screenshot foi detectado em uma conversa
 * Cria uma mensagem de sistema no chat informando sobre a captura
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { chatId, method } = body;

    if (!chatId) {
      return NextResponse.json({ error: 'chatId is required' }, { status: 400 });
    }

    // Verificar se o usuário faz parte do chat
    const { data: participation, error: participationError } = await getSupabaseAdmin()
      .from('chat_participants')
      .select('user_id')
      .eq('chat_id', chatId)
      .eq('user_id', user.id)
      .single();

    if (participationError || !participation) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    // Buscar o nickname do usuário
    const { data: profile } = await getSupabaseAdmin()
      .from('profiles')
      .select('nickname')
      .eq('id', user.id)
      .single();

    const nickname = profile?.nickname || 'Alguém';

    // Criar uma mensagem de sistema notificando sobre o screenshot
    const systemMessage = {
      chat_id: chatId,
      sender_id: user.id,
      content: `📸 ${nickname} pode ter tirado uma captura de tela`,
      type: 'system',
      metadata: {
        type: 'screenshot_alert',
        method: method || 'unknown',
        detected_at: new Date().toISOString(),
      }
    };

    const { data: message, error: insertError } = await getSupabaseAdmin()
      .from('messages')
      .insert(systemMessage)
      .select('*')
      .single();

    if (insertError) {
      console.error('Error creating screenshot alert:', insertError);
      return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error('Screenshot alert error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET - Obtém o histórico de alertas de screenshot de um chat
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');

    if (!chatId) {
      return NextResponse.json({ error: 'chatId is required' }, { status: 400 });
    }

    // Verificar participação
    const { data: participation, error: participationError } = await getSupabaseAdmin()
      .from('chat_participants')
      .select('user_id')
      .eq('chat_id', chatId)
      .eq('user_id', user.id)
      .single();

    if (participationError || !participation) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    // Buscar alertas de screenshot
    const { data: alerts, error: alertsError } = await getSupabaseAdmin()
      .from('messages')
      .select('id, sender_id, content, created_at, metadata')
      .eq('chat_id', chatId)
      .eq('type', 'system')
      .not('metadata', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (alertsError) {
      console.error('Error fetching screenshot alerts:', alertsError);
      return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
    }

    // Filtrar apenas alertas de screenshot
    const screenshotAlerts = (alerts || []).filter(
      alert => alert.metadata?.type === 'screenshot_alert'
    );

    return NextResponse.json({ alerts: screenshotAlerts });
  } catch (error) {
    console.error('Get screenshot alerts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
