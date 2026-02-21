import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const subscription = body?.subscription;

    // Validar estrutura da subscription
    if (!subscription || typeof subscription !== 'object' ||
        typeof subscription.endpoint !== 'string' ||
        !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json({ message: 'Subscription inválida: endpoint e keys são obrigatórios' }, { status: 400 });
    }

    // Upsert para evitar duplicatas (baseado em user_id + endpoint)
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: user.id,
        subscription_json: subscription,
      },
      { onConflict: 'user_id,subscription_json->>endpoint' }
    ).select();

    // Fallback: se upsert falhar por falta de constraint, tentar delete + insert
    if (error) {
      // Deletar subscriptions antigas do mesmo endpoint
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .filter('subscription_json->>endpoint', 'eq', subscription.endpoint);

      const { error: insertError } = await supabase.from('push_subscriptions').insert({
        user_id: user.id,
        subscription_json: subscription,
      });

      if (insertError) {
        return NextResponse.json({ message: 'Erro ao salvar inscrição' }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    logger.error('Erro ao salvar inscrição push', e instanceof Error ? e : new Error(String(e)));
    return NextResponse.json({ message: 'Erro ao salvar inscrição' }, { status: 500 });
  }
}
