import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';
import { createError, ErrorType, logError, getUserFriendlyMessage } from '@/lib/error-handler';

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

    // Buscar customer_id do Stripe no perfil do usuário
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    // Se não tem customer_id, buscar ou criar no Stripe
    if (!customerId) {
      // Buscar por email
      const customers = await stripe.customers.list({
        email: user.email || undefined,
        limit: 1,
      });

      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        // Salvar no perfil
        await supabase
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', user.id);
      } else {
        // Criar novo customer
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          metadata: {
            userId: user.id,
          },
        });
        customerId = customer.id;
        // Salvar no perfil
        await supabase
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', user.id);
      }
    }

    // Criar sessão do portal de billing
    const origin = req.headers.get('origin') || 'http://localhost:3001';
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/dashboard/profile`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const appError = createError(ErrorType.SERVER, 'Erro ao criar sessão do portal de billing', {
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
