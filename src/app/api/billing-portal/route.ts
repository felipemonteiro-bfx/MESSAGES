import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar o ID do cliente Stripe no banco de dados
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: 'Nenhuma assinatura ativa encontrada' }, { status: 404 });
    }

    // Criar a sessão do portal de faturamento
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${req.headers.get('origin')}/profile`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Erro no Portal:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
