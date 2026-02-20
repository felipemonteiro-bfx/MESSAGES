/**
 * Gerenciamento de configurações do usuário
 */

const AUTO_LOCK_TIMEOUT_KEY = 'n24h_auto_lock_timeout';
const INCOGNITO_MODE_KEY = 'n24h_incognito_mode';
const AUTO_LOCK_ON_SCREEN_LOCK_KEY = 'n24h_auto_lock_on_screen_lock';
const GHOST_MODE_KEY = 'n24h_ghost_mode';
const READ_RECEIPTS_KEY = 'n24h_read_receipts';
const LAST_SEEN_VISIBLE_KEY = 'n24h_last_seen_visible';

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

// ============================================
// MODO FANTASMA (GHOST MODE)
// ============================================

/**
 * Verifica se o modo fantasma está ativo
 * Quando ativo, esconde status online e desabilita confirmações de leitura
 */
export function isGhostModeEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(GHOST_MODE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Ativa/desativa o modo fantasma
 */
export function setGhostMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (enabled) {
      localStorage.setItem(GHOST_MODE_KEY, 'true');
    } else {
      localStorage.removeItem(GHOST_MODE_KEY);
    }
  } catch { /* ignore */ }
}

/**
 * Verifica se confirmações de leitura estão habilitadas
 */
export function areReadReceiptsEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(READ_RECEIPTS_KEY) !== 'false';
  } catch {
    return true;
  }
}

/**
 * Ativa/desativa confirmações de leitura
 */
export function setReadReceipts(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (enabled) {
      localStorage.removeItem(READ_RECEIPTS_KEY);
    } else {
      localStorage.setItem(READ_RECEIPTS_KEY, 'false');
    }
  } catch { /* ignore */ }
}

/**
 * Verifica se "visto por último" está visível para outros
 */
export function isLastSeenVisible(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(LAST_SEEN_VISIBLE_KEY) !== 'false';
  } catch {
    return true;
  }
}

/**
 * Ativa/desativa visibilidade do "visto por último"
 */
export function setLastSeenVisible(visible: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (visible) {
      localStorage.removeItem(LAST_SEEN_VISIBLE_KEY);
    } else {
      localStorage.setItem(LAST_SEEN_VISIBLE_KEY, 'false');
    }
  } catch { /* ignore */ }
}
