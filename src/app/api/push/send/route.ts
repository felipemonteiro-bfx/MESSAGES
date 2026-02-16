import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin, getApiErrorMessage } from '@/lib/supabase/admin';
import webPush from 'web-push';

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_MAILTO = process.env.VAPID_MAILTO || 'mailto:contato@noticias24h.com.br';

// Configurar VAPID uma vez no nível do módulo
if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webPush.setVapidDetails(VAPID_MAILTO, VAPID_PUBLIC, VAPID_PRIVATE);
}

export async function POST(req: Request) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return NextResponse.json({ message: 'Push não configurado (VAPID)' }, { status: 503 });
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const recipientId = body?.recipientId as string | undefined;
    const content = (body?.content as string) || '';

    if (!recipientId) {
      return NextResponse.json({ message: 'recipientId obrigatório' }, { status: 400 });
    }

    // Validar tamanho do conteúdo
    if (content.length > 5000) {
      return NextResponse.json({ message: 'Conteúdo muito longo' }, { status: 400 });
    }

    // Verificar se o remetente está no mesmo chat que o destinatário (usando admin para bypass RLS)
    const { data: sharedChats, error: chatError } = await getSupabaseAdmin()
      .from('chat_participants')
      .select('chat_id')
      .eq('user_id', user.id);

    if (chatError || !sharedChats?.length) {
      return NextResponse.json({ message: 'Sem permissão para enviar notificação' }, { status: 403 });
    }

    const chatIds = sharedChats.map(c => c.chat_id);
    const { data: recipientChats } = await getSupabaseAdmin()
      .from('chat_participants')
      .select('chat_id')
      .eq('user_id', recipientId)
      .in('chat_id', chatIds);

    if (!recipientChats?.length) {
      return NextResponse.json({ message: 'Sem permissão para enviar notificação a este usuário' }, { status: 403 });
    }

    const { data: rows, error } = await getSupabaseAdmin()
      .from('push_subscriptions')
      .select('id, subscription_json')
      .eq('user_id', recipientId);

    if (error || !rows?.length) {
      return NextResponse.json({ ok: true });
    }

    // Sempre disfarçar notificação como notícia (nunca expor conteúdo real)
    const fakeHeadlines = [
      'Economia brasileira apresenta novos indicadores',
      'Avanço tecnológico promete transformar setor de saúde',
      'Previsão do tempo: mudanças climáticas em destaque',
      'Mercado financeiro reage a decisões do Banco Central',
      'Novas descobertas científicas surpreendem pesquisadores',
      'Governo anuncia medidas para infraestrutura urbana',
      'Esportes: resultados e destaques da rodada',
      'Cultura: eventos e lançamentos movimentam a semana',
    ];
    const newsSources = ['G1', 'BBC Brasil', 'Folha', 'UOL', 'CNN Brasil', 'Globo'];
    const randomHeadline = fakeHeadlines[Math.floor(Math.random() * fakeHeadlines.length)];
    const randomSource = newsSources[Math.floor(Math.random() * newsSources.length)];

    const payload = JSON.stringify({
      title: randomHeadline,
      body: `${randomSource} • Agora`,
      url: '/',
      isMessage: true,
    });

    const expiredSubscriptionIds: string[] = [];

    const sendPromises = rows.map((row) => {
      const sub = row.subscription_json as { endpoint: string; keys: { p256dh: string; auth: string } };
      return webPush.sendNotification(sub, payload).catch((err: { statusCode?: number }) => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          expiredSubscriptionIds.push(row.id);
        }
      });
    });

    await Promise.all(sendPromises);

    // Limpar subscriptions expiradas (usando admin para bypass RLS)
    if (expiredSubscriptionIds.length > 0) {
      await getSupabaseAdmin()
        .from('push_subscriptions')
        .delete()
        .in('id', expiredSubscriptionIds);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Error in POST /api/push/send:', e);
    return NextResponse.json(
      { message: getApiErrorMessage(e) },
      { status: 500 }
    );
  }
}
