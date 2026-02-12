import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const subscription = body?.subscription;
    if (!subscription || typeof subscription !== 'object') {
      return NextResponse.json({ message: 'subscription inválido' }, { status: 400 });
    }

    const { error } = await supabase.from('push_subscriptions').insert({
      user_id: user.id,
      subscription_json: subscription,
    });

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ message: 'Erro ao salvar inscrição' }, { status: 500 });
  }
}
