import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

// Usar Service Role Key para ignorar RLS ao atualizar o status premium
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get('Stripe-Signature') as string;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  const session = event.data.object as any;

  // Lógica para quando a assinatura é criada ou o pagamento é confirmado
  if (event.type === 'checkout.session.completed' || event.type === 'customer.subscription.updated') {
    const userId = session.metadata?.userId;

    if (userId) {
      await supabaseAdmin
        .from('profiles')
        .update({ is_premium: true })
        .eq('id', userId);
      
      console.log(`Usuário ${userId} agora é PREMIUM.`);
    }
  }

  // Lógica para quando a assinatura é cancelada
  if (event.type === 'customer.subscription.deleted') {
    const userId = session.metadata?.userId;
    if (userId) {
      await supabaseAdmin
        .from('profiles')
        .update({ is_premium: false })
        .eq('id', userId);
    }
  }

  return NextResponse.json({ received: true });
}
