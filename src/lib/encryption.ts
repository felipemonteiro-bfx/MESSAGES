/**
 * Sistema de criptografia E2E (End-to-End Encryption)
 * Usa Web Crypto API para criptografar mensagens antes de enviar ao Supabase
 */

const KEY_STORAGE_PREFIX = 'stealth_e2e_key_';
const IV_LENGTH = 12;
const KEY_LENGTH = 256;

/**
 * Gerar par de chaves RSA para um usuário
 * A chave privada é criptografada com uma chave derivada do PIN
 */
export async function generateKeyPair(userId: string, pin: string): Promise<{ publicKey: string; privateKeyEncrypted: string }> {
  // Gerar par de chaves RSA-OAEP
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );

  // Exportar chave pública (armazenar no banco)
  const publicKeyBuffer = await crypto.subtle.exportKey('spki', keyPair.publicKey);
  const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)));

  // Criptografar chave privada com PIN
  const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
  const privateKeyArray = new Uint8Array(privateKeyBuffer);
  const privateKeyEncrypted = await encryptWithPin(privateKeyArray, pin);

  // Armazenar chave privada criptografada localmente
  localStorage.setItem(`${KEY_STORAGE_PREFIX}${userId}`, privateKeyEncrypted);

  return {
    publicKey: publicKeyBase64,
    privateKeyEncrypted,
  };
}

/**
 * Derivar chave AES do PIN usando PBKDF2
 */
async function deriveKeyFromPin(pin: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const pinData = encoder.encode(pin);
  const salt = encoder.encode('stealth-salt'); // Em produção, usar salt único por usuário

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    pinData,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Criptografar dados com PIN (usado para proteger chave privada)
 */
async function encryptWithPin(data: Uint8Array, pin: string): Promise<string> {
  const key = await deriveKeyFromPin(pin);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Criar uma cópia para garantir que seja um ArrayBuffer válido
  const dataBuffer = new Uint8Array(data).buffer;
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    dataBuffer
  );

  // Combinar IV + dados criptografados e converter para base64
  const combined = new Uint8Array(IV_LENGTH + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), IV_LENGTH);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Descriptografar dados com PIN
 */
async function decryptWithPin(encryptedData: string, pin: string): Promise<Uint8Array> {
  const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  const iv = combined.slice(0, IV_LENGTH);
  const data = combined.slice(IV_LENGTH);

  const key = await deriveKeyFromPin(pin);
  // Criar uma cópia para garantir que seja um ArrayBuffer válido
  const dataBuffer = new Uint8Array(data).buffer;
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    dataBuffer
  );

  return new Uint8Array(decrypted);
}

/**
 * Criptografar mensagem com chave pública do destinatário
 */
export async function encryptMessage(message: string, recipientPublicKeyBase64: string): Promise<string> {
  // Importar chave pública do destinatário
  const publicKeyArray = Uint8Array.from(atob(recipientPublicKeyBase64), c => c.charCodeAt(0));
  const publicKeyBuffer = new Uint8Array(publicKeyArray).buffer;
  const publicKey = await crypto.subtle.importKey(
    'spki',
    publicKeyBuffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  );

  // Criptografar mensagem
  const encoder = new TextEncoder();
  const messageData = encoder.encode(message);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    messageData
  );

  return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}

/**
 * Descriptografar mensagem com chave privada do usuário
 */
export async function decryptMessage(encryptedMessage: string, userId: string, pin: string): Promise<string> {
  // Recuperar e descriptografar chave privada
  const encryptedPrivateKey = localStorage.getItem(`${KEY_STORAGE_PREFIX}${userId}`);
  if (!encryptedPrivateKey) {
    throw new Error('Chave privada não encontrada. Gere um par de chaves primeiro.');
  }

  const privateKeyBuffer = await decryptWithPin(encryptedPrivateKey, pin);
  // Criar uma cópia para garantir que seja um ArrayBuffer válido
  const keyBuffer = new Uint8Array(privateKeyBuffer).buffer;
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['decrypt']
  );

  // Descriptografar mensagem
  const encryptedData = Uint8Array.from(atob(encryptedMessage), c => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    encryptedData
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Verificar se usuário já tem chaves E2E configuradas
 */
export function hasE2EKeys(userId: string): boolean {
  return localStorage.getItem(`${KEY_STORAGE_PREFIX}${userId}`) !== null;
}

/**
 * Obter chave privada criptografada (para backup/exportação)
 */
export function getEncryptedPrivateKey(userId: string): string | null {
  return localStorage.getItem(`${KEY_STORAGE_PREFIX}${userId}`);
}
