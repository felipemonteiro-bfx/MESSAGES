import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin, getApiErrorMessage } from '@/lib/supabase/admin';
import webPush from 'web-push';
import { isApnsConfigured, sendApns } from '@/lib/apns';

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_MAILTO = process.env.VAPID_MAILTO || 'mailto:contato@noticias24h.com.br';

// Configurar VAPID uma vez no nível do módulo
if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webPush.setVapidDetails(VAPID_MAILTO, VAPID_PUBLIC, VAPID_PRIVATE);
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  const hasWebPush = !!(VAPID_PUBLIC && VAPID_PRIVATE);
  const hasNativePush = isApnsConfigured();
  if (!hasWebPush && !hasNativePush) {
    return NextResponse.json({ message: 'Push não configurado (configure VAPID ou APNs)' }, { status: 503 });
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
      .select('chat_id, muted, mute_until')
      .eq('user_id', recipientId)
      .in('chat_id', chatIds);

    if (!recipientChats?.length) {
      return NextResponse.json({ message: 'Sem permissão para enviar notificação a este usuário' }, { status: 403 });
    }

    const now = new Date().toISOString();
    const isMuted = recipientChats.some(
      (r: { muted?: boolean; mute_until?: string | null }) =>
        r.muted && (!r.mute_until || r.mute_until > now)
    );
    if (isMuted) return NextResponse.json({ ok: true });

    let rows: { id: string; subscription_json: unknown }[] = [];
    if (hasWebPush) {
      const { data, error } = await getSupabaseAdmin()
        .from('push_subscriptions')
        .select('id, subscription_json')
        .eq('user_id', recipientId);
      if (!error && data) rows = data;
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

    const sendPromises = (hasWebPush ? rows : []).map((row) => {
      const sub = row.subscription_json as { endpoint: string; keys: { p256dh: string; auth: string } };
      return webPush.sendNotification(sub, payload).catch((err: { statusCode?: number }) => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          expiredSubscriptionIds.push(row.id);
        }
      });
    });

    await Promise.all(sendPromises);

    if (expiredSubscriptionIds.length > 0) {
      await getSupabaseAdmin()
        .from('push_subscriptions')
        .delete()
        .in('id', expiredSubscriptionIds);
    }

    // Enviar para tokens nativos iOS (APNs)
    if (isApnsConfigured()) {
      const { data: nativeRows } = await getSupabaseAdmin()
        .from('push_tokens')
        .select('id, token')
        .eq('user_id', recipientId)
        .eq('platform', 'ios');

      if (nativeRows?.length) {
        const tokens = nativeRows.map((r: { token: string }) => r.token);
        const { sent, failed } = await sendApns(tokens, {
          title: randomHeadline,
          body: `${randomSource} • Agora`,
          badge: 1,
        });
        if (failed.length > 0) {
          const tokenSet = new Set(failed);
          const toDelete = nativeRows
            .filter((r: { token: string }) => tokenSet.has(r.token))
            .map((r: { id: string }) => r.id);
          if (toDelete.length > 0) {
            await getSupabaseAdmin().from('push_tokens').delete().in('id', toDelete);
          }
        }
      }
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
