/**
 * Sistema seguro de gerenciamento de PIN
 * Usa Web Crypto API (PBKDF2) para hash criptográfico do PIN
 * Suporta Dual PIN: PIN Principal (acesso real) e PIN Pânico (acesso decoy)
 */

const PIN_STORAGE_KEY = 'n24h_pin_hash';
const PIN_SALT_KEY = 'n24h_pin_salt';
const PIN_SETUP_KEY = 'n24h_pin_setup';
const PIN_FAILED_ATTEMPTS_KEY = 'n24h_pin_failed_attempts';
const PIN_LOCKOUT_UNTIL_KEY = 'stealth_pin_lockout_until';

// Dual PIN - Modo Pânico
const DECOY_PIN_STORAGE_KEY = 'n24h_decoy_pin_hash';
const DECOY_PIN_SALT_KEY = 'n24h_decoy_pin_salt';
const DECOY_PIN_ENABLED_KEY = 'n24h_decoy_pin_enabled';
const CURRENT_MODE_KEY = 'n24h_access_mode';

const MAX_ATTEMPTS = 5;
const BASE_LOCKOUT_MS = 60_000; // 1 minuto base

export type AccessMode = 'main' | 'decoy';

function isValidPin(pin: string): boolean {
  if (pin.length < 4 || pin.length > 32) return false;
  return /^\d{4,8}$/.test(pin) || /^[a-zA-Z0-9!@#$%^&*]{6,32}$/.test(pin);
}

/**
 * Gera um salt aleatório para cada usuário
 */
function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...salt));
}

/**
 * Hash criptográfico do PIN usando PBKDF2 via Web Crypto API
 */
async function hashPinSecure(pin: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const pinData = encoder.encode(pin);
  const saltData = encoder.encode(salt);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    pinData,
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltData,
      iterations: 600000, // OWASP 2023 recommendation
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  return btoa(String.fromCharCode(...new Uint8Array(derivedBits)));
}

/**
 * Verifica se o PIN já foi configurado
 */
export function isPinConfigured(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(PIN_STORAGE_KEY) !== null;
}

/**
 * Configura um novo PIN (primeira vez ou reset)
 */
export async function setupPin(pin: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  if (!isValidPin(pin)) {
    return false;
  }

  const salt = generateSalt();
  const hash = await hashPinSecure(pin, salt);
  localStorage.setItem(PIN_SALT_KEY, salt);
  localStorage.setItem(PIN_STORAGE_KEY, hash);
  localStorage.setItem(PIN_SETUP_KEY, 'true');
  return true;
}

/**
 * Verifica se o PIN fornecido está correto
 * Retorna false se PIN não foi configurado (requer setup explícito)
 */
export async function verifyPin(pin: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const storedHash = localStorage.getItem(PIN_STORAGE_KEY);
  const storedSalt = localStorage.getItem(PIN_SALT_KEY);

  if (!storedHash || !storedSalt) {
    // PIN não configurado - NÃO auto-configurar, retornar false
    return false;
  }

  // Adicionar delay constante para prevenir timing attacks
  const startTime = performance.now();
  const inputHash = await hashPinSecure(pin, storedSalt);
  const elapsed = performance.now() - startTime;

  // Garantir tempo mínimo de 100ms para prevenir timing attacks
  if (elapsed < 100) {
    await new Promise(resolve => setTimeout(resolve, 100 - elapsed));
  }

  // Comparação constant-time
  if (inputHash.length !== storedHash.length) return false;
  let result = 0;
  for (let i = 0; i < inputHash.length; i++) {
    result |= inputHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Reseta o PIN (requer autenticação do usuário)
 */
export function resetPin(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PIN_STORAGE_KEY);
  localStorage.removeItem(PIN_SALT_KEY);
  localStorage.removeItem(PIN_SETUP_KEY);
}

/**
 * Altera o PIN (requer verificação do PIN antigo)
 */
export async function changePin(oldPin: string, newPin: string): Promise<boolean> {
  if (!(await verifyPin(oldPin))) {
    return false;
  }

  if (!isValidPin(newPin)) {
    return false;
  }

  return setupPin(newPin);
}

/**
 * Rate limit anti brute-force com backoff exponencial
 */
export function recordFailedAttempt(): void {
  if (typeof window === 'undefined') return;
  const count = parseInt(localStorage.getItem(PIN_FAILED_ATTEMPTS_KEY) ?? '0', 10) + 1;
  localStorage.setItem(PIN_FAILED_ATTEMPTS_KEY, String(count));
  if (count >= MAX_ATTEMPTS) {
    // Backoff exponencial: 1min, 2min, 4min, 8min, 16min...
    const lockoutRounds = Math.floor(count / MAX_ATTEMPTS);
    const lockoutMs = BASE_LOCKOUT_MS * Math.pow(2, Math.min(lockoutRounds - 1, 4)); // Max 16 min
    localStorage.setItem(PIN_LOCKOUT_UNTIL_KEY, String(Date.now() + lockoutMs));
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

// ============================================
// DUAL PIN - SISTEMA DE MODO PÂNICO
// ============================================

/**
 * Verifica se o PIN de pânico (decoy) está configurado
 */
export function isDecoyPinConfigured(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(DECOY_PIN_STORAGE_KEY) !== null;
}

/**
 * Verifica se o modo pânico está habilitado
 */
export function isDecoyPinEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(DECOY_PIN_ENABLED_KEY) === 'true';
}

/**
 * Habilita/desabilita o modo pânico
 */
export function setDecoyPinEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  if (enabled) {
    localStorage.setItem(DECOY_PIN_ENABLED_KEY, 'true');
  } else {
    localStorage.removeItem(DECOY_PIN_ENABLED_KEY);
  }
}

/**
 * Configura o PIN de pânico (decoy)
 */
export async function setupDecoyPin(pin: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  if (!isValidPin(pin)) {
    return false;
  }

  // Não permitir que PIN decoy seja igual ao PIN principal
  const mainHash = localStorage.getItem(PIN_STORAGE_KEY);
  const mainSalt = localStorage.getItem(PIN_SALT_KEY);
  if (mainHash && mainSalt) {
    const testHash = await hashPinSecure(pin, mainSalt);
    if (testHash === mainHash) {
      return false; // PIN decoy não pode ser igual ao principal
    }
  }

  const salt = generateSalt();
  const hash = await hashPinSecure(pin, salt);
  localStorage.setItem(DECOY_PIN_SALT_KEY, salt);
  localStorage.setItem(DECOY_PIN_STORAGE_KEY, hash);
  localStorage.setItem(DECOY_PIN_ENABLED_KEY, 'true');
  return true;
}

/**
 * Verifica o PIN de pânico
 */
export async function verifyDecoyPin(pin: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const storedHash = localStorage.getItem(DECOY_PIN_STORAGE_KEY);
  const storedSalt = localStorage.getItem(DECOY_PIN_SALT_KEY);

  if (!storedHash || !storedSalt) {
    return false;
  }

  const startTime = performance.now();
  const inputHash = await hashPinSecure(pin, storedSalt);
  const elapsed = performance.now() - startTime;

  if (elapsed < 100) {
    await new Promise(resolve => setTimeout(resolve, 100 - elapsed));
  }

  if (inputHash.length !== storedHash.length) return false;
  let result = 0;
  for (let i = 0; i < inputHash.length; i++) {
    result |= inputHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Verifica qual PIN foi inserido (principal, pânico ou inválido)
 * Retorna o modo de acesso correspondente ou null se PIN inválido
 */
export async function verifyPinAndGetMode(pin: string): Promise<AccessMode | null> {
  if (typeof window === 'undefined') return null;

  // Verificar PIN principal primeiro
  const isMainValid = await verifyPin(pin);
  if (isMainValid) {
    setCurrentAccessMode('main');
    return 'main';
  }

  // Se modo pânico está habilitado, verificar PIN decoy
  if (isDecoyPinEnabled()) {
    const isDecoyValid = await verifyDecoyPin(pin);
    if (isDecoyValid) {
      setCurrentAccessMode('decoy');
      return 'decoy';
    }
  }

  return null;
}

/**
 * Define o modo de acesso atual (main ou decoy)
 */
export function setCurrentAccessMode(mode: AccessMode): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CURRENT_MODE_KEY, mode);
}

/**
 * Obtém o modo de acesso atual
 */
export function getCurrentAccessMode(): AccessMode {
  if (typeof window === 'undefined') return 'main';
  const stored = localStorage.getItem(CURRENT_MODE_KEY);
  return stored === 'decoy' ? 'decoy' : 'main';
}

/**
 * Limpa o modo de acesso (volta para main)
 */
export function clearAccessMode(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CURRENT_MODE_KEY);
}

/**
 * Remove o PIN de pânico
 */
export function removeDecoyPin(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DECOY_PIN_STORAGE_KEY);
  localStorage.removeItem(DECOY_PIN_SALT_KEY);
  localStorage.removeItem(DECOY_PIN_ENABLED_KEY);
}

/**
 * Altera o PIN de pânico (requer verificação do PIN atual)
 */
export async function changeDecoyPin(currentPin: string, newPin: string): Promise<boolean> {
  const mode = await verifyPinAndGetMode(currentPin);
  if (!mode) {
    return false;
  }

  if (!isValidPin(newPin)) {
    return false;
  }

  return setupDecoyPin(newPin);
}
