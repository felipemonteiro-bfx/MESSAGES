import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { createError, ErrorType } from '@/lib/error-handler';
import { env } from '@/lib/env';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  if (!webhookSecret) {
    logger.error('Stripe webhook secret not configured');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    logger.warn('Missing Stripe signature in webhook request');
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    );
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    logger.error('Webhook signature verification failed', error);
    return NextResponse.json(
      { error: `Webhook Error: ${error.message}` },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as { id: string; customer?: string; subscription?: string; metadata?: { userId?: string; planName?: string } };
        
        if (session.metadata?.userId) {
          const userId = session.metadata.userId;
          const planName = session.metadata.planName || 'Pro';
          
          // Atualizar perfil do usuário para premium
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ 
              is_premium: true,
              stripe_customer_id: session.customer || null,
            })
            .eq('id', userId);

          if (updateError) {
            logger.error('Failed to update user profile after checkout', updateError as Error, {
              userId,
              sessionId: session.id,
            });
          } else {
            logger.info('User upgraded to premium', {
              userId,
              planName,
              sessionId: session.id,
            });
          }
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as { id: string; customer: string; status: string };
        
        // Buscar usuário pelo customer_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', subscription.customer)
          .single();

        if (profile) {
          const isActive = subscription.status === 'active' || subscription.status === 'trialing';
          
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ is_premium: isActive })
            .eq('id', profile.id);

          if (updateError) {
            logger.error('Failed to update subscription status', updateError as Error, {
              userId: profile.id,
              subscriptionId: subscription.id,
              status: subscription.status,
            });
          } else {
            logger.info('Subscription status updated', {
              userId: profile.id,
              subscriptionId: subscription.id,
              status: subscription.status,
              isPremium: isActive,
            });
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as { customer: string; subscription?: string };
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('stripe_customer_id', invoice.customer)
          .single();

        if (profile) {
          logger.warn('Payment failed for user', {
            userId: profile.id,
            customerId: invoice.customer,
            subscriptionId: invoice.subscription,
          });
          
          // Aqui você pode adicionar lógica para notificar o usuário
          // Por exemplo, enviar email ou criar notificação no sistema
        }
        break;
      }

      default:
        logger.debug('Unhandled webhook event type', {
          type: event.type,
        });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const appError = createError(ErrorType.SERVER, 'Error processing webhook', {
      originalError: error,
    });
    logger.error('Webhook processing error', appError.originalError as Error, {
      eventType: event.type,
    });
    
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
