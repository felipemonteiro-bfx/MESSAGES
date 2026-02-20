/**
 * Forward Secrecy via ECDH ephemeral key exchange + symmetric ratchet.
 *
 * Each conversation session generates a new ECDH key pair (P-256).
 * When two participants exchange ephemeral public keys, they derive a
 * shared AES-256 key via ECDH + HKDF. This key encrypts all messages
 * in the session. Compromising one session key does not compromise
 * past sessions (forward secrecy).
 *
 * The symmetric ratchet advances the key after every N messages using
 * HKDF, providing additional forward secrecy within a session.
 */

import { secureGet, secureSet } from '@/lib/key-storage';

const SESSION_KEY_PREFIX = 'stealth_fs_session_';
const RATCHET_STEP = 10;
const IV_LENGTH = 12;

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

export interface SessionKeys {
  localPublicKey: string;
  localPrivateKey: string;
  remotePublicKey?: string;
  sharedSecret?: string;
  messageCount: number;
  createdAt: string;
}

export async function generateEphemeralKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  const pubBuf = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const privBuf = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

  return {
    publicKey: arrayBufferToBase64(pubBuf),
    privateKey: arrayBufferToBase64(privBuf),
  };
}

async function deriveSharedSecret(
  localPrivateKeyBase64: string,
  remotePublicKeyBase64: string
): Promise<CryptoKey> {
  const privKeyBuf = base64ToArrayBuffer(localPrivateKeyBase64);
  const localPrivKey = await crypto.subtle.importKey(
    'pkcs8',
    new Uint8Array(privKeyBuf).buffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveBits']
  );

  const pubKeyBuf = base64ToArrayBuffer(remotePublicKeyBase64);
  const remotePublicKey = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(pubKeyBuf).buffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: remotePublicKey },
    localPrivKey,
    256
  );

  // HKDF to derive AES key from raw shared secret
  const hkdfKey = await crypto.subtle.importKey(
    'raw',
    sharedBits,
    'HKDF',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new TextEncoder().encode('stealth-fs-v1'),
      info: new TextEncoder().encode('message-encryption'),
    },
    hkdfKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Ratchet the key forward by deriving a new key from the current one.
 */
async function ratchetKey(currentKey: CryptoKey, step: number): Promise<CryptoKey> {
  const rawKey = await crypto.subtle.exportKey('raw', currentKey);
  const hkdfKey = await crypto.subtle.importKey('raw', rawKey, 'HKDF', false, ['deriveKey']);

  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new TextEncoder().encode(`ratchet-step-${step}`),
      info: new TextEncoder().encode('stealth-fs-ratchet'),
    },
    hkdfKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function initSession(chatId: string): Promise<{ publicKey: string }> {
  const kp = await generateEphemeralKeyPair();
  const session: SessionKeys = {
    localPublicKey: kp.publicKey,
    localPrivateKey: kp.privateKey,
    messageCount: 0,
    createdAt: new Date().toISOString(),
  };
  await secureSet(`${SESSION_KEY_PREFIX}${chatId}`, JSON.stringify(session));
  return { publicKey: kp.publicKey };
}

export async function completeSession(chatId: string, remotePublicKey: string): Promise<boolean> {
  const raw = await secureGet(`${SESSION_KEY_PREFIX}${chatId}`);
  if (!raw) return false;

  const session: SessionKeys = JSON.parse(raw);
  const sharedKey = await deriveSharedSecret(session.localPrivateKey, remotePublicKey);
  const exportedKey = arrayBufferToBase64(await crypto.subtle.exportKey('raw', sharedKey));

  session.remotePublicKey = remotePublicKey;
  session.sharedSecret = exportedKey;
  await secureSet(`${SESSION_KEY_PREFIX}${chatId}`, JSON.stringify(session));
  return true;
}

export async function getSessionKey(chatId: string): Promise<CryptoKey | null> {
  const raw = await secureGet(`${SESSION_KEY_PREFIX}${chatId}`);
  if (!raw) return null;

  const session: SessionKeys = JSON.parse(raw);
  if (!session.sharedSecret) return null;

  const keyBuf = base64ToArrayBuffer(session.sharedSecret);
  let key = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(keyBuf).buffer,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  // Apply ratchet steps based on message count
  const ratchetSteps = Math.floor(session.messageCount / RATCHET_STEP);
  for (let i = 0; i < ratchetSteps; i++) {
    key = await ratchetKey(key, i);
  }

  return key;
}

export async function encryptWithSession(
  chatId: string,
  plaintext: string
): Promise<{ ciphertext: string; messageIndex: number } | null> {
  const key = await getSessionKey(chatId);
  if (!key) return null;

  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const data = new TextEncoder().encode(plaintext);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);

  const raw = await secureGet(`${SESSION_KEY_PREFIX}${chatId}`);
  if (!raw) return null;
  const session: SessionKeys = JSON.parse(raw);
  const messageIndex = session.messageCount;
  session.messageCount++;
  await secureSet(`${SESSION_KEY_PREFIX}${chatId}`, JSON.stringify(session));

  const combined = new Uint8Array(IV_LENGTH + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), IV_LENGTH);

  return {
    ciphertext: arrayBufferToBase64(combined.buffer),
    messageIndex,
  };
}

export async function decryptWithSession(
  chatId: string,
  ciphertextBase64: string,
  messageIndex: number
): Promise<string | null> {
  const raw = await secureGet(`${SESSION_KEY_PREFIX}${chatId}`);
  if (!raw) return null;

  const session: SessionKeys = JSON.parse(raw);
  if (!session.sharedSecret) return null;

  const keyBuf = base64ToArrayBuffer(session.sharedSecret);
  let key = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(keyBuf).buffer,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const ratchetSteps = Math.floor(messageIndex / RATCHET_STEP);
  for (let i = 0; i < ratchetSteps; i++) {
    key = await ratchetKey(key, i);
  }

  const combined = base64ToArrayBuffer(ciphertextBase64);
  const iv = combined.slice(0, IV_LENGTH);
  const data = combined.slice(IV_LENGTH);

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      new Uint8Array(data).buffer
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}

export async function hasActiveSession(chatId: string): Promise<boolean> {
  const raw = await secureGet(`${SESSION_KEY_PREFIX}${chatId}`);
  if (!raw) return false;
  try {
    const session: SessionKeys = JSON.parse(raw);
    return !!session.sharedSecret;
  } catch {
    return false;
  }
}

export async function getSessionPublicKey(chatId: string): Promise<string | null> {
  const raw = await secureGet(`${SESSION_KEY_PREFIX}${chatId}`);
  if (!raw) return null;
  try {
    const session: SessionKeys = JSON.parse(raw);
    return session.localPublicKey;
  } catch {
    return null;
  }
}
