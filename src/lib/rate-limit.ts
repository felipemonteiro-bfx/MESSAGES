/**
 * Sistema de rate limiting
 * 
 * Nota: Em ambientes serverless (Vercel), o Map em memória é por instância.
 * Para rate limiting global, integre com Upstash Redis (@upstash/ratelimit).
 * Este módulo funciona como fallback local e é eficaz em ambientes tradicionais.
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitStore {
  count: number;
  resetTime: number;
}

// Store em memória (por instância em serverless)
const rateLimitStore = new Map<string, RateLimitStore>();

// Configurações de rate limiting por endpoint
export const RATE_LIMITS = {
  // Autenticação
  login: { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 tentativas por 15 minutos
  signup: { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 tentativas por hora
  
  // Mensagens
  sendMessage: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 mensagens por minuto
  
  // Push notifications
  pushSend: { maxRequests: 60, windowMs: 60 * 1000 }, // 60 por minuto
  pushSubscribe: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 por minuto
  
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
  
  // Verificar se excedeu o limite ANTES de incrementar
  const allowed = store.count < config.maxRequests;
  
  if (allowed) {
    store.count++;
  }
  
  const remaining = Math.max(0, config.maxRequests - store.count);
  
  return {
    allowed,
    remaining,
    resetAt: store.resetTime,
  };
}

/**
 * Limpa entradas expiradas do store
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, store] of rateLimitStore.entries()) {
    if (now > store.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Limpar entradas expiradas a cada 5 minutos (apenas em ambientes com setInterval)
let cleanupInterval: ReturnType<typeof setInterval> | null = null;
if (typeof setInterval !== 'undefined' && !cleanupInterval) {
  cleanupInterval = setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
  // Permitir que o processo termine sem esperar pelo interval
  if (cleanupInterval && typeof cleanupInterval === 'object' && 'unref' in cleanupInterval) {
    cleanupInterval.unref();
  }
}

/**
 * Obtém identificador único para rate limiting
 * Prioriza user ID, fallback para IP (primeiro valor do x-forwarded-for)
 */
export function getRateLimitIdentifier(
  request: Request,
  userId?: string
): string {
  if (userId) {
    return `user:${userId}`;
  }
  
  // Usar apenas o primeiro IP do x-forwarded-for (set pelo proxy confiável)
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  return `ip:${ip}`;
}
