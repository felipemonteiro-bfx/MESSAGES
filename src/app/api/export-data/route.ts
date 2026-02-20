import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Exportação de dados do usuário (LGPD - Art. 18)
 * Retorna perfil, contatos e mensagens em JSON
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 });
    }

    // Buscar perfil
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Buscar chats onde o usuário participa
    const { data: participants } = await supabase
      .from('chat_participants')
      .select('chat_id')
      .eq('user_id', user.id);

    const chatIds = (participants || []).map((p) => p.chat_id);

    // Buscar mensagens em que o usuário participou
    let messages: unknown[] = [];
    if (chatIds.length > 0) {
      const { data: msgs } = await supabase
        .from('messages')
        .select('id, content, media_url, media_type, created_at, sender_id, chat_id')
        .in('chat_id', chatIds)
        .order('created_at', { ascending: true });
      messages = msgs || [];
    }

    // Montar exportação
    const exportData = {
      exportedAt: new Date().toISOString(),
      userId: user.id,
      email: user.email,
      profile: profile || null,
      messages,
      messageCount: messages.length,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="meus-dados-${user.id.slice(0, 8)}.json"`,
      },
    });
  } catch (err) {
    console.error('Export data error:', err);
    return NextResponse.json(
      { error: 'Erro ao exportar dados. Tente novamente.' },
      { status: 500 }
    );
  }
}
