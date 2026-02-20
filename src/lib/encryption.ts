/**
 * Sistema de criptografia E2E (End-to-End Encryption)
 * Usa Web Crypto API com criptografia híbrida (RSA-OAEP + AES-GCM)
 *
 * - Salt dinâmico por usuário
 * - Criptografia híbrida: RSA encripta chave AES, AES encripta mensagem
 * - Conversão base64 segura para buffers grandes
 * - Iterações PBKDF2: 600.000 (OWASP 2023)
 * - Armazenamento via IndexedDB (fallback localStorage)
 */

import { secureGet, secureSet, secureHas } from '@/lib/key-storage';

const KEY_STORAGE_PREFIX = 'stealth_e2e_key_';
const SALT_STORAGE_PREFIX = 'stealth_e2e_salt_';
const SIGN_KEY_PREFIX = 'stealth_e2e_sign_';
const SIGN_SALT_PREFIX = 'stealth_e2e_sign_salt_';
const IV_LENGTH = 12;
const KEY_LENGTH = 256;
const AES_KEY_LENGTH = 256;

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

export async function generateKeyPair(userId: string, pin: string): Promise<{ publicKey: string; signingPublicKey: string; privateKeyEncrypted: string }> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );

  const publicKeyBuffer = await crypto.subtle.exportKey('spki', keyPair.publicKey);
  const publicKeyBase64 = arrayBufferToBase64(publicKeyBuffer);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltBase64 = arrayBufferToBase64(salt.buffer);

  const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
  const privateKeyArray = new Uint8Array(privateKeyBuffer);
  const privateKeyEncrypted = await encryptWithPin(privateKeyArray, pin, salt);

  await secureSet(`${KEY_STORAGE_PREFIX}${userId}`, privateKeyEncrypted);
  await secureSet(`${SALT_STORAGE_PREFIX}${userId}`, saltBase64);

  // ECDSA P-256 signing key pair
  const signKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );

  const signPubBuffer = await crypto.subtle.exportKey('spki', signKeyPair.publicKey);
  const signingPublicKey = arrayBufferToBase64(signPubBuffer);

  const signPrivBuffer = await crypto.subtle.exportKey('pkcs8', signKeyPair.privateKey);
  const signSalt = crypto.getRandomValues(new Uint8Array(16));
  const signSaltBase64 = arrayBufferToBase64(signSalt.buffer);
  const signPrivEncrypted = await encryptWithPin(new Uint8Array(signPrivBuffer), pin, signSalt);

  await secureSet(`${SIGN_KEY_PREFIX}${userId}`, signPrivEncrypted);
  await secureSet(`${SIGN_SALT_PREFIX}${userId}`, signSaltBase64);

  return {
    publicKey: publicKeyBase64,
    signingPublicKey,
    privateKeyEncrypted,
  };
}

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
      iterations: 600000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptWithPin(data: Uint8Array, pin: string, salt: Uint8Array): Promise<string> {
  const key = await deriveKeyFromPin(pin, salt);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const dataBuffer = new Uint8Array(data).buffer;
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    dataBuffer
  );

  const combined = new Uint8Array(IV_LENGTH + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), IV_LENGTH);

  return arrayBufferToBase64(combined.buffer);
}

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

export async function encryptMessage(message: string, recipientPublicKeyBase64: string): Promise<string> {
  const publicKeyArray = base64ToArrayBuffer(recipientPublicKeyBase64);
  const publicKeyBuffer = new Uint8Array(publicKeyArray).buffer;
  const publicKey = await crypto.subtle.importKey(
    'spki',
    publicKeyBuffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  );

  const aesKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    true,
    ['encrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();
  const messageData = encoder.encode(message);
  const encryptedMessage = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    messageData
  );

  const rawAesKey = await crypto.subtle.exportKey('raw', aesKey);
  const encryptedAesKey = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    rawAesKey
  );

  // Format: [encAesKeyLen(2B)][encAesKey][iv(12B)][encMsg]
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

export async function decryptMessage(encryptedMessage: string, userId: string, pin: string): Promise<string> {
  const saltBase64 = await secureGet(`${SALT_STORAGE_PREFIX}${userId}`);
  const encryptedPrivateKey = await secureGet(`${KEY_STORAGE_PREFIX}${userId}`);
  
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

  const combined = base64ToArrayBuffer(encryptedMessage);
  let offset = 0;

  const encAesKeyLen = (combined[offset] << 8) | combined[offset + 1];
  offset += 2;

  const encAesKey = combined.slice(offset, offset + encAesKeyLen);
  offset += encAesKeyLen;

  const iv = combined.slice(offset, offset + IV_LENGTH);
  offset += IV_LENGTH;

  const encMsg = combined.slice(offset);

  const rawAesKey = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    new Uint8Array(encAesKey).buffer
  );

  const aesKey = await crypto.subtle.importKey(
    'raw',
    rawAesKey,
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    new Uint8Array(encMsg).buffer
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Sign a message payload with the sender's ECDSA private key.
 * Returns the signature as base64, or null if signing keys are not available.
 */
export async function signMessage(payload: string, userId: string, pin: string): Promise<string | null> {
  const encSignKey = await secureGet(`${SIGN_KEY_PREFIX}${userId}`);
  const signSaltB64 = await secureGet(`${SIGN_SALT_PREFIX}${userId}`);
  if (!encSignKey || !signSaltB64) return null;

  const signSalt = base64ToArrayBuffer(signSaltB64);
  const signPrivRaw = await decryptWithPin(encSignKey, pin, signSalt);
  const signPrivKey = await crypto.subtle.importKey(
    'pkcs8',
    new Uint8Array(signPrivRaw).buffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const data = new TextEncoder().encode(payload);
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    signPrivKey,
    data
  );

  return arrayBufferToBase64(signature);
}

/**
 * Verify a message signature with the sender's ECDSA public key.
 */
export async function verifySignature(
  payload: string,
  signatureBase64: string,
  signingPublicKeyBase64: string
): Promise<boolean> {
  try {
    const pubKeyBuf = base64ToArrayBuffer(signingPublicKeyBase64);
    const pubKey = await crypto.subtle.importKey(
      'spki',
      new Uint8Array(pubKeyBuf).buffer,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );

    const data = new TextEncoder().encode(payload);
    const signature = base64ToArrayBuffer(signatureBase64);

    return crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      pubKey,
      new Uint8Array(signature).buffer,
      data
    );
  } catch {
    return false;
  }
}

export async function hasE2EKeys(userId: string): Promise<boolean> {
  return secureHas(`${KEY_STORAGE_PREFIX}${userId}`);
}

export async function getEncryptedPrivateKey(userId: string): Promise<string | null> {
  return secureGet(`${KEY_STORAGE_PREFIX}${userId}`);
}

/**
 * Export all E2E keys as a JSON bundle encrypted with a user-provided passphrase.
 * The bundle can be imported on another device.
 */
export async function exportKeys(userId: string, pin: string, exportPassphrase: string): Promise<string> {
  const encKey = await secureGet(`${KEY_STORAGE_PREFIX}${userId}`);
  const keySalt = await secureGet(`${SALT_STORAGE_PREFIX}${userId}`);
  const signKey = await secureGet(`${SIGN_KEY_PREFIX}${userId}`);
  const signSalt = await secureGet(`${SIGN_SALT_PREFIX}${userId}`);

  if (!encKey || !keySalt) {
    throw new Error('No keys found to export');
  }

  // Decrypt private keys with PIN, then re-encrypt with export passphrase
  const decSalt = base64ToArrayBuffer(keySalt);
  const decPrivKey = await decryptWithPin(encKey, pin, decSalt);

  let decSignKey: Uint8Array | null = null;
  if (signKey && signSalt) {
    const ssSalt = base64ToArrayBuffer(signSalt);
    decSignKey = await decryptWithPin(signKey, pin, ssSalt);
  }

  const exportSalt = crypto.getRandomValues(new Uint8Array(16));
  const reEncKey = await encryptWithPin(decPrivKey, exportPassphrase, exportSalt);
  let reEncSignKey: string | null = null;
  if (decSignKey) {
    const signExportSalt = crypto.getRandomValues(new Uint8Array(16));
    reEncSignKey = await encryptWithPin(decSignKey, exportPassphrase, signExportSalt);
    const bundle = JSON.stringify({
      version: 2,
      userId,
      encryptionKey: reEncKey,
      encryptionSalt: arrayBufferToBase64(exportSalt.buffer),
      signingKey: reEncSignKey,
      signingSalt: arrayBufferToBase64(signExportSalt.buffer),
      exportedAt: new Date().toISOString(),
    });
    return btoa(bundle);
  }

  const bundle = JSON.stringify({
    version: 2,
    userId,
    encryptionKey: reEncKey,
    encryptionSalt: arrayBufferToBase64(exportSalt.buffer),
    signingKey: null,
    signingSalt: null,
    exportedAt: new Date().toISOString(),
  });
  return btoa(bundle);
}

/**
 * Import keys from an exported bundle.
 */
export async function importKeys(exportedBundle: string, importPassphrase: string, newPin: string): Promise<{ userId: string }> {
  const bundleJson = atob(exportedBundle);
  const bundle = JSON.parse(bundleJson);

  if (bundle.version !== 2) {
    throw new Error('Unsupported bundle version');
  }

  const { userId, encryptionKey, encryptionSalt, signingKey, signingSalt } = bundle;

  // Decrypt with export passphrase
  const expSalt = base64ToArrayBuffer(encryptionSalt);
  const rawPrivKey = await decryptWithPin(encryptionKey, importPassphrase, expSalt);

  // Re-encrypt with new PIN
  const newSalt = crypto.getRandomValues(new Uint8Array(16));
  const newEncKey = await encryptWithPin(rawPrivKey, newPin, newSalt);

  await secureSet(`${KEY_STORAGE_PREFIX}${userId}`, newEncKey);
  await secureSet(`${SALT_STORAGE_PREFIX}${userId}`, arrayBufferToBase64(newSalt.buffer));

  if (signingKey && signingSalt) {
    const ssSalt = base64ToArrayBuffer(signingSalt);
    const rawSignKey = await decryptWithPin(signingKey, importPassphrase, ssSalt);
    const newSignSalt = crypto.getRandomValues(new Uint8Array(16));
    const newSignEnc = await encryptWithPin(rawSignKey, newPin, newSignSalt);
    await secureSet(`${SIGN_KEY_PREFIX}${userId}`, newSignEnc);
    await secureSet(`${SIGN_SALT_PREFIX}${userId}`, arrayBufferToBase64(newSignSalt.buffer));
  }

  return { userId };
}
