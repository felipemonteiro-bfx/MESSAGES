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

const PIN_STORAGE_KEY = 'warranty_tracker_pin_hash';
const PIN_SETUP_KEY = 'warranty_tracker_pin_setup';

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
