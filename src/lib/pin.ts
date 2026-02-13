/**
 * Sistema seguro de gerenciamento de PIN
 * Armazena hash do PIN no localStorage (não o PIN em texto plano)
 */

// Função simples de hash (em produção, considere usar crypto.subtle)
function hashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

const PIN_STORAGE_KEY = 'stealth_messaging_pin_hash';
const PIN_SETUP_KEY = 'stealth_messaging_pin_setup';
const PIN_FAILED_ATTEMPTS_KEY = 'stealth_pin_failed_attempts';
const PIN_LOCKOUT_UNTIL_KEY = 'stealth_pin_lockout_until';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60_000; // 1 minuto

/**
 * Verifica se o PIN já foi configurado
 */
export function isPinConfigured(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(PIN_STORAGE_KEY) !== null;
}

/**
 * Configura um novo PIN (primeira vez)
 */
export function setupPin(pin: string): boolean {
  if (typeof window === 'undefined') return false;
  
  // Validação: PIN deve ter exatamente 4 dígitos
  if (!/^\d{4}$/.test(pin)) {
    return false;
  }
  
  const hash = hashPin(pin);
  localStorage.setItem(PIN_STORAGE_KEY, hash);
  localStorage.setItem(PIN_SETUP_KEY, 'true');
  return true;
}

/**
 * Verifica se o PIN fornecido está correto
 */
export function verifyPin(pin: string): boolean {
  if (typeof window === 'undefined') return false;
  
  const storedHash = localStorage.getItem(PIN_STORAGE_KEY);
  if (!storedHash) {
    // Se não há PIN configurado, aceita qualquer PIN de 4 dígitos na primeira vez
    if (/^\d{4}$/.test(pin)) {
      setupPin(pin);
      return true;
    }
    return false;
  }
  
  const inputHash = hashPin(pin);
  return inputHash === storedHash;
}

/**
 * Reseta o PIN (requer autenticação do usuário)
 */
export function resetPin(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PIN_STORAGE_KEY);
  localStorage.removeItem(PIN_SETUP_KEY);
}

/**
 * Altera o PIN (requer verificação do PIN antigo)
 */
export function changePin(oldPin: string, newPin: string): boolean {
  if (!verifyPin(oldPin)) {
    return false;
  }
  
  if (!/^\d{4}$/.test(newPin)) {
    return false;
  }
  
  return setupPin(newPin);
}

/**
 * Rate limit anti brute-force: grava tentativa falha e aplica bloqueio após 5 erros
 */
export function recordFailedAttempt(): void {
  if (typeof window === 'undefined') return;
  const count = parseInt(localStorage.getItem(PIN_FAILED_ATTEMPTS_KEY) ?? '0', 10) + 1;
  localStorage.setItem(PIN_FAILED_ATTEMPTS_KEY, String(count));
  if (count >= MAX_ATTEMPTS) {
    localStorage.setItem(PIN_LOCKOUT_UNTIL_KEY, String(Date.now() + LOCKOUT_MS));
  }
}

/**
 * Limpa tentativas falhas (chamar após PIN correto)
 */
export function clearFailedAttempts(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PIN_FAILED_ATTEMPTS_KEY);
  localStorage.removeItem(PIN_LOCKOUT_UNTIL_KEY);
}

/**
 * Verifica se está em período de bloqueio
 */
export function isLockedOut(): boolean {
  if (typeof window === 'undefined') return false;
  const until = localStorage.getItem(PIN_LOCKOUT_UNTIL_KEY);
  if (!until) return false;
  return Date.now() < parseInt(until, 10);
}

/**
 * Retorna ms restantes de bloqueio (0 se não bloqueado)
 */
export function getRemainingLockoutMs(): number {
  if (typeof window === 'undefined') return 0;
  const until = localStorage.getItem(PIN_LOCKOUT_UNTIL_KEY);
  if (!until) return 0;
  const remaining = parseInt(until, 10) - Date.now();
  return Math.max(0, remaining);
}
