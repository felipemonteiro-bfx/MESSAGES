import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { checkRateLimit, getRateLimitIdentifier, RATE_LIMITS } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export async function middleware(request: NextRequest) {
  // Atualizar sessão do Supabase primeiro
  const supabaseResponse = await updateSession(request);

  // Rate limiting para rotas de API (pular em modo de teste)
  const isTestMode = request.cookies.get('test-bypass')?.value === 'true';
  
  if (!isTestMode && request.nextUrl.pathname.startsWith('/api/')) {
    const identifier = getRateLimitIdentifier(request);
    
    // Determinar qual limite usar baseado no endpoint
    const pathname = request.nextUrl.pathname;
    let config: { maxRequests: number; windowMs: number } = RATE_LIMITS.default;
    
    if (pathname.includes('/checkout')) {
      config = RATE_LIMITS.checkout;
    } else if (pathname.includes('/billing-portal')) {
      config = RATE_LIMITS.billingPortal;
    }
    
    const rateLimit = checkRateLimit(identifier, config);
    
    if (!rateLimit.allowed) {
      logger.warn('Rate limit exceeded', {
        identifier,
        pathname,
        remaining: rateLimit.remaining,
        resetAt: new Date(rateLimit.resetAt).toISOString(),
      });
      
      return NextResponse.json(
        { 
          error: 'Too many requests',
          message: 'Você excedeu o limite de requisições. Tente novamente mais tarde.',
          retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimit.resetAt).toISOString(),
          },
        }
      );
    }
    
    // Adicionar headers de rate limit na resposta
    const response = supabaseResponse.clone();
    response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(rateLimit.resetAt).toISOString());
    
    return response;
  }

  // Rate limiting para rotas de autenticação
  if (request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/signup')) {
    const identifier = getRateLimitIdentifier(request);
    const authConfig: { maxRequests: number; windowMs: number } = request.nextUrl.pathname.startsWith('/login') 
      ? RATE_LIMITS.login 
      : RATE_LIMITS.signup;
    
    const rateLimit = checkRateLimit(identifier, authConfig);
    
    if (!rateLimit.allowed) {
      logger.warn('Auth rate limit exceeded', {
        identifier,
        pathname: request.nextUrl.pathname,
      });
      
      // Redirecionar com mensagem de erro
      const url = request.nextUrl.clone();
      url.searchParams.set('error', 'rate_limit');
      url.searchParams.set('message', 'Muitas tentativas. Tente novamente em alguns minutos.');
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
