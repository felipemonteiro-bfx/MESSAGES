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
  try {
    const stored = localStorage.getItem(AUTO_LOCK_TIMEOUT_KEY);
    if (!stored) return 10;
    const value = parseInt(stored, 10);
    return ([10, 30, 60, 300, 0].includes(value) ? value : 10) as AutoLockTimeout;
  } catch {
    return 10;
  }
}

/**
 * Definir tempo de auto-lock
 */
export function setAutoLockTimeout(timeout: AutoLockTimeout): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AUTO_LOCK_TIMEOUT_KEY, String(timeout));
  } catch { /* ignore */ }
}

/**
 * Verificar se modo incógnito está ativo
 */
export function isIncognitoMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(INCOGNITO_MODE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Ativar/desativar modo incógnito
 */
export function setIncognitoMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (enabled) {
      localStorage.setItem(INCOGNITO_MODE_KEY, 'true');
    } else {
      localStorage.removeItem(INCOGNITO_MODE_KEY);
    }
  } catch { /* ignore */ }
}

/**
 * Limpar dados locais do modo incógnito
 * Remove chaves de cache de mensagens e mídia
 */
export function clearIncognitoData(): void {
  if (typeof window === 'undefined') return;
  try {
    // Limpar caches de mensagens
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('msg_cache_') || key.startsWith('media_cache_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Limpar IndexedDB de mensagens em cache
    if ('indexedDB' in window) {
      indexedDB.deleteDatabase('media-cache');
    }
  } catch {
    // Falha silenciosa
  }
}

/**
 * Verificar se auto-lock ao bloquear tela está ativo
 */
export function getAutoLockOnScreenLock(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const stored = localStorage.getItem(AUTO_LOCK_ON_SCREEN_LOCK_KEY);
    return stored !== 'false';
  } catch {
    return true;
  }
}

/**
 * Definir auto-lock ao bloquear tela
 */
export function setAutoLockOnScreenLock(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (enabled) {
      localStorage.removeItem(AUTO_LOCK_ON_SCREEN_LOCK_KEY);
    } else {
      localStorage.setItem(AUTO_LOCK_ON_SCREEN_LOCK_KEY, 'false');
    }
  } catch { /* ignore */ }
}
