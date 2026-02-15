import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { checkRateLimit, getRateLimitIdentifier, RATE_LIMITS } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export async function middleware(request: NextRequest) {
  // Atualizar sessão do Supabase primeiro
  const supabaseResponse = await updateSession(request);

  if (request.nextUrl.pathname.startsWith('/api/')) {
    const identifier = getRateLimitIdentifier(request);
    
    // Determinar qual limite usar baseado no endpoint
    const pathname = request.nextUrl.pathname;
    let config: { maxRequests: number; windowMs: number } = RATE_LIMITS.default;
    
    if (pathname.includes('/push/send')) {
      config = RATE_LIMITS.pushSend;
    } else if (pathname.includes('/push/subscribe')) {
      config = RATE_LIMITS.pushSubscribe;
    }
    
    const rateLimit = checkRateLimit(`${identifier}:${pathname}`, config);
    
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
    const response = supabaseResponse;
    response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(rateLimit.resetAt).toISOString());
    
    return response;
  }

  // Rate limiting para rotas de autenticação (apenas se não já tem erro de rate limit)
  if ((request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/signup'))
      && !request.nextUrl.searchParams.has('error')) {
    const identifier = getRateLimitIdentifier(request);
    const authConfig: { maxRequests: number; windowMs: number } = request.nextUrl.pathname.startsWith('/login') 
      ? RATE_LIMITS.login 
      : RATE_LIMITS.signup;
    
    const rateLimit = checkRateLimit(`${identifier}:auth`, authConfig);
    
    if (!rateLimit.allowed) {
      logger.warn('Auth rate limit exceeded', {
        identifier,
        pathname: request.nextUrl.pathname,
      });
      
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
     * - public folder assets (svg, png, jpg, etc.)
     * - sw.js (service worker)
     * - manifest.json (PWA manifest)
     */
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
