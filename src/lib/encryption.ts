/**
 * Sistema de criptografia E2E (End-to-End Encryption)
 * Usa Web Crypto API com criptografia híbrida (RSA-OAEP + AES-GCM)
 * 
 * Correções aplicadas:
 * - Salt dinâmico por usuário (não mais hardcoded)
 * - Criptografia híbrida: RSA encripta chave AES, AES encripta mensagem
 * - Conversão base64 segura para buffers grandes (sem spread operator)
 * - Iterações PBKDF2 aumentadas para 600.000 (OWASP 2023)
 */

const KEY_STORAGE_PREFIX = 'stealth_e2e_key_';
const SALT_STORAGE_PREFIX = 'stealth_e2e_salt_';
const IV_LENGTH = 12;
const KEY_LENGTH = 256;
const AES_KEY_LENGTH = 256;

// --- Utilitários de conversão base64 seguros para buffers grandes ---

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunks: string[] = [];
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    chunks.push(String.fromCharCode(...chunk));
  }
  return btoa(chunks.join(''));
}

function base64ToArrayBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

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
  const publicKeyBase64 = arrayBufferToBase64(publicKeyBuffer);

  // Gerar salt único para este usuário
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltBase64 = arrayBufferToBase64(salt.buffer);

  // Criptografar chave privada com PIN + salt único
  const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
  const privateKeyArray = new Uint8Array(privateKeyBuffer);
  const privateKeyEncrypted = await encryptWithPin(privateKeyArray, pin, salt);

  // Armazenar chave privada criptografada e salt localmente
  localStorage.setItem(`${KEY_STORAGE_PREFIX}${userId}`, privateKeyEncrypted);
  localStorage.setItem(`${SALT_STORAGE_PREFIX}${userId}`, saltBase64);

  return {
    publicKey: publicKeyBase64,
    privateKeyEncrypted,
  };
}

/**
 * Derivar chave AES do PIN usando PBKDF2 com salt dinâmico
 */
async function deriveKeyFromPin(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const pinData = encoder.encode(pin);

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
      salt: new Uint8Array(salt).buffer as ArrayBuffer,
      iterations: 600000, // OWASP 2023 recommendation
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
async function encryptWithPin(data: Uint8Array, pin: string, salt: Uint8Array): Promise<string> {
  const key = await deriveKeyFromPin(pin, salt);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

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

  return arrayBufferToBase64(combined.buffer);
}

/**
 * Descriptografar dados com PIN
 */
async function decryptWithPin(encryptedData: string, pin: string, salt: Uint8Array): Promise<Uint8Array> {
  const combined = base64ToArrayBuffer(encryptedData);
  const iv = combined.slice(0, IV_LENGTH);
  const data = combined.slice(IV_LENGTH);

  const key = await deriveKeyFromPin(pin, salt);
  const dataBuffer = new Uint8Array(data).buffer;
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    dataBuffer
  );

  return new Uint8Array(decrypted);
}

/**
 * Criptografia híbrida: RSA-OAEP + AES-GCM
 * RSA encripta uma chave AES efêmera, AES encripta a mensagem
 * Isso remove o limite de ~190 bytes do RSA direto
 */
export async function encryptMessage(message: string, recipientPublicKeyBase64: string): Promise<string> {
  // Importar chave pública do destinatário
  const publicKeyArray = base64ToArrayBuffer(recipientPublicKeyBase64);
  const publicKeyBuffer = new Uint8Array(publicKeyArray).buffer;
  const publicKey = await crypto.subtle.importKey(
    'spki',
    publicKeyBuffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  );

  // 1. Gerar chave AES efêmera para esta mensagem
  const aesKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    true,
    ['encrypt']
  );

  // 2. Criptografar mensagem com AES-GCM
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();
  const messageData = encoder.encode(message);
  const encryptedMessage = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    messageData
  );

  // 3. Exportar e criptografar chave AES com RSA-OAEP
  const rawAesKey = await crypto.subtle.exportKey('raw', aesKey);
  const encryptedAesKey = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    rawAesKey
  );

  // 4. Combinar: [encryptedAesKeyLength(2 bytes)][encryptedAesKey][iv][encryptedMessage]
  const encAesKeyBytes = new Uint8Array(encryptedAesKey);
  const encMsgBytes = new Uint8Array(encryptedMessage);
  const keyLenBytes = new Uint8Array(2);
  keyLenBytes[0] = (encAesKeyBytes.length >> 8) & 0xff;
  keyLenBytes[1] = encAesKeyBytes.length & 0xff;

  const combined = new Uint8Array(2 + encAesKeyBytes.length + IV_LENGTH + encMsgBytes.length);
  let offset = 0;
  combined.set(keyLenBytes, offset); offset += 2;
  combined.set(encAesKeyBytes, offset); offset += encAesKeyBytes.length;
  combined.set(iv, offset); offset += IV_LENGTH;
  combined.set(encMsgBytes, offset);

  return arrayBufferToBase64(combined.buffer);
}

/**
 * Descriptografar mensagem com criptografia híbrida
 */
export async function decryptMessage(encryptedMessage: string, userId: string, pin: string): Promise<string> {
  // Recuperar salt e chave privada criptografada
  const saltBase64 = localStorage.getItem(`${SALT_STORAGE_PREFIX}${userId}`);
  const encryptedPrivateKey = localStorage.getItem(`${KEY_STORAGE_PREFIX}${userId}`);
  
  if (!encryptedPrivateKey || !saltBase64) {
    throw new Error('Chave privada não encontrada. Gere um par de chaves primeiro.');
  }

  const salt = base64ToArrayBuffer(saltBase64);
  const privateKeyBuffer = await decryptWithPin(encryptedPrivateKey, pin, salt);
  const keyBuffer = new Uint8Array(privateKeyBuffer).buffer;
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['decrypt']
  );

  // Decompor payload
  const combined = base64ToArrayBuffer(encryptedMessage);
  let offset = 0;

  // Ler comprimento da chave AES criptografada
  const encAesKeyLen = (combined[offset] << 8) | combined[offset + 1];
  offset += 2;

  // Extrair chave AES criptografada
  const encAesKey = combined.slice(offset, offset + encAesKeyLen);
  offset += encAesKeyLen;

  // Extrair IV
  const iv = combined.slice(offset, offset + IV_LENGTH);
  offset += IV_LENGTH;

  // Extrair mensagem criptografada
  const encMsg = combined.slice(offset);

  // 1. Descriptografar chave AES com RSA
  const rawAesKey = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    new Uint8Array(encAesKey).buffer
  );

  // 2. Importar chave AES
  const aesKey = await crypto.subtle.importKey(
    'raw',
    rawAesKey,
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    false,
    ['decrypt']
  );

  // 3. Descriptografar mensagem com AES
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    new Uint8Array(encMsg).buffer
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
