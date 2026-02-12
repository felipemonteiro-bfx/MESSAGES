import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';
import { checkoutRequestSchema } from '@/lib/validation';
import { createError, ErrorType, logError, getUserFriendlyMessage } from '@/lib/error-handler';
import { env } from '@/lib/env';

export async function POST(req: Request) {
  try {
    // Verificar autenticação
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      const error = createError(ErrorType.AUTHENTICATION, 'Usuário não autenticado', {
        statusCode: 401,
        originalError: authError,
      });
      logError(error);
      return NextResponse.json(
        { error: getUserFriendlyMessage(error) },
        { status: 401 }
      );
    }

    // Validar body da requisição
    const body = await req.json();
    const validation = checkoutRequestSchema.safeParse(body);

    if (!validation.success) {
      const error = createError(ErrorType.VALIDATION, 'Dados inválidos', {
        statusCode: 400,
        originalError: validation.error,
      });
      logError(error);
      return NextResponse.json(
        { error: getUserFriendlyMessage(error) },
        { status: 400 }
      );
    }

    const { priceId, planName } = validation.data;

    // Criar sessão de checkout no Stripe
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '') || req.headers.get('origin') || 'http://localhost:3001'}/dashboard/plans?success=true`,
      cancel_url: `${req.headers.get('origin') || 'http://localhost:3001'}/dashboard/plans?canceled=true`,
      metadata: {
        userId: user.id,
        planName: planName,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          planName: planName,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const appError = createError(ErrorType.SERVER, 'Erro ao criar sessão de checkout', {
      statusCode: 500,
      originalError: error,
    });
    logError(appError);
    return NextResponse.json(
      { error: getUserFriendlyMessage(appError) },
      { status: 500 }
    );
  }
}
