/**
 * Sistema básico de rate limiting usando Map em memória
 * Para produção, considere usar @upstash/ratelimit ou Redis
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitStore {
  count: number;
  resetTime: number;
}

// Store em memória (resetado a cada restart do servidor)
// Em produção, use Redis ou Upstash
const rateLimitStore = new Map<string, RateLimitStore>();

// Configurações de rate limiting por endpoint
export const RATE_LIMITS = {
  // Autenticação
  login: { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 tentativas por 15 minutos
  signup: { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 tentativas por hora
  
  // Mensagens
  sendMessage: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 mensagens por minuto
  
  // API
  checkout: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 por minuto
  billingPortal: { maxRequests: 5, windowMs: 60 * 1000 }, // 5 por minuto
  
  // Geral
  default: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 por minuto
} as const;

/**
 * Verifica se o limite de taxa foi excedido
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = RATE_LIMITS.default
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const key = identifier;
  
  let store = rateLimitStore.get(key);
  
  // Se não existe ou expirou, criar novo
  if (!store || now > store.resetTime) {
    store = {
      count: 0,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, store);
  }
  
  // Incrementar contador
  store.count++;
  
  // Verificar se excedeu o limite
  const allowed = store.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - store.count);
  
  return {
    allowed,
    remaining,
    resetAt: store.resetTime,
  };
}

/**
 * Limpa entradas expiradas do store (chamado periodicamente)
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, store] of rateLimitStore.entries()) {
    if (now > store.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Limpar entradas expiradas a cada 5 minutos
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
}

/**
 * Obtém identificador único para rate limiting
 * Pode ser IP, user ID, ou combinação
 */
export function getRateLimitIdentifier(
  request: Request,
  userId?: string
): string {
  // Priorizar user ID se disponível (mais preciso)
  if (userId) {
    return `user:${userId}`;
  }
  
  // Fallback para IP
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  return `ip:${ip}`;
}
