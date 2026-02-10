import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

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

  if (event.type === 'checkout.session.completed') {
    const userId = session.metadata?.userId;
    const customerId = session.customer;

    if (userId) {
      await supabaseAdmin
        .from('profiles')
        .update({ 
          is_premium: true,
          stripe_customer_id: customerId // SALVANDO O ID DO CLIENTE
        })
        .eq('id', userId);
    }
  }

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