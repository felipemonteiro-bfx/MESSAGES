/**
 * Gerenciamento de configurações do usuário
 */

const AUTO_LOCK_TIMEOUT_KEY = 'stealth_auto_lock_timeout';
const INCOGNITO_MODE_KEY = 'stealth_incognito_mode';
const AUTO_LOCK_ON_SCREEN_LOCK_KEY = 'stealth_auto_lock_on_screen_lock';

export type AutoLockTimeout = 10 | 30 | 60 | 300 | 0; // 10s, 30s, 1min, 5min, Nunca (0)

/**
 * Obter tempo de auto-lock configurado (em segundos)
 */
export function getAutoLockTimeout(): AutoLockTimeout {
  if (typeof window === 'undefined') return 10;
  const stored = localStorage.getItem(AUTO_LOCK_TIMEOUT_KEY);
  if (!stored) return 10; // Padrão: 10 segundos
  const value = parseInt(stored, 10);
  return ([10, 30, 60, 300, 0].includes(value) ? value : 10) as AutoLockTimeout;
}

/**
 * Definir tempo de auto-lock
 */
export function setAutoLockTimeout(timeout: AutoLockTimeout): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTO_LOCK_TIMEOUT_KEY, String(timeout));
}

/**
 * Verificar se modo incógnito está ativo
 */
export function isIncognitoMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(INCOGNITO_MODE_KEY) === 'true';
}

/**
 * Ativar/desativar modo incógnito
 */
export function setIncognitoMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  if (enabled) {
    localStorage.setItem(INCOGNITO_MODE_KEY, 'true');
  } else {
    localStorage.removeItem(INCOGNITO_MODE_KEY);
  }
}

/**
 * Limpar dados locais do modo incógnito
 */
export function clearIncognitoData(): void {
  if (typeof window === 'undefined') return;
  // Limpar apenas dados sensíveis, não configurações
  // Mensagens já são apagadas ao fechar chat se modo incógnito estiver ativo
}

/**
 * Verificar se auto-lock ao bloquear tela está ativo
 */
export function getAutoLockOnScreenLock(): boolean {
  if (typeof window === 'undefined') return true; // Padrão: ativo
  const stored = localStorage.getItem(AUTO_LOCK_ON_SCREEN_LOCK_KEY);
  return stored !== 'false'; // Padrão: true
}

/**
 * Definir auto-lock ao bloquear tela
 */
export function setAutoLockOnScreenLock(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  if (enabled) {
    localStorage.removeItem(AUTO_LOCK_ON_SCREEN_LOCK_KEY);
  } else {
    localStorage.setItem(AUTO_LOCK_ON_SCREEN_LOCK_KEY, 'false');
  }
}
