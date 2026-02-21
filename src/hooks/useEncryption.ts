'use client';

import { useState, useCallback, useRef } from 'react';
import {
  generateKeyPair,
  encryptMessage,
  decryptMessage,
  hasE2EKeys,
  signMessage,
  verifySignature,
  exportKeys,
  importKeys,
} from '@/lib/encryption';
import {
  initSession,
  completeSession,
  encryptWithSession,
  decryptWithSession,
  hasActiveSession,
  getSessionPublicKey,
} from '@/lib/forward-secrecy';
import { logger } from '@/lib/logger';

interface UseEncryptionOptions {
  userId: string | null;
  pin: string | null;
}

interface DecryptedCache {
  [messageId: string]: string;
}

export function useEncryption({ userId, pin }: UseEncryptionOptions) {
  const [e2eEnabled, setE2eEnabled] = useState(false);
  const [isGeneratingKeys, setIsGeneratingKeys] = useState(false);
  const decryptedCacheRef = useRef<DecryptedCache>({});
  const publicKeyCacheRef = useRef<Record<string, string>>({});

  const initializeKeys = useCallback(async () => {
    if (!userId || !pin) return false;

    if (await hasE2EKeys(userId)) {
      setE2eEnabled(true);
      return true;
    }

    setIsGeneratingKeys(true);
    try {
      const { publicKey, signingPublicKey } = await generateKeyPair(userId, pin);

      await fetch('/api/profile/public-key', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey, signingPublicKey }),
      });

      setE2eEnabled(true);
      logger.info('E2E keys generated and published', { userId });
      return true;
    } catch (error) {
      logger.warn('Failed to initialize E2E keys', { error });
      return false;
    } finally {
      setIsGeneratingKeys(false);
    }
  }, [userId, pin]);

  const getRecipientPublicKey = useCallback(async (recipientId: string): Promise<string | null> => {
    if (publicKeyCacheRef.current[recipientId]) {
      return publicKeyCacheRef.current[recipientId];
    }

    try {
      const response = await fetch(`/api/profile/public-key?userId=${recipientId}`);
      if (!response.ok) return null;

      const { publicKey } = await response.json();
      if (publicKey) {
        publicKeyCacheRef.current[recipientId] = publicKey;
      }
      return publicKey || null;
    } catch {
      return null;
    }
  }, []);

  const encrypt = useCallback(async (
    message: string,
    recipientPublicKey: string,
    senderPublicKey?: string
  ): Promise<string | null> => {
    try {
      return await encryptMessage(message, recipientPublicKey, senderPublicKey);
    } catch (error) {
      logger.warn('Encryption failed', { error });
      return null;
    }
  }, []);

  const decrypt = useCallback(async (
    encryptedContent: string,
    messageId: string
  ): Promise<string | null> => {
    if (decryptedCacheRef.current[messageId]) {
      return decryptedCacheRef.current[messageId];
    }

    if (!userId || !pin) return null;

    try {
      const plaintext = await decryptMessage(encryptedContent, userId, pin);
      decryptedCacheRef.current[messageId] = plaintext;
      return plaintext;
    } catch (error) {
      logger.warn('Decryption failed', { messageId, error });
      return null;
    }
  }, [userId, pin]);

  const sign = useCallback(async (payload: string): Promise<string | null> => {
    if (!userId || !pin) return null;
    try {
      return await signMessage(payload, userId, pin);
    } catch {
      return null;
    }
  }, [userId, pin]);

  const verify = useCallback(async (
    payload: string,
    signature: string,
    signingPublicKey: string
  ): Promise<boolean> => {
    try {
      return await verifySignature(payload, signature, signingPublicKey);
    } catch {
      return false;
    }
  }, []);

  const exportUserKeys = useCallback(async (passphrase: string): Promise<string | null> => {
    if (!userId || !pin) return null;
    try {
      return await exportKeys(userId, pin, passphrase);
    } catch {
      return null;
    }
  }, [userId, pin]);

  const importUserKeys = useCallback(async (bundle: string, passphrase: string): Promise<boolean> => {
    if (!pin) return false;
    try {
      await importKeys(bundle, passphrase, pin);
      setE2eEnabled(true);
      return true;
    } catch {
      return false;
    }
  }, [pin]);

  const startForwardSecrecySession = useCallback(async (chatId: string): Promise<string | null> => {
    try {
      const { publicKey } = await initSession(chatId);
      logger.info('FS session initiated', { chatId });
      return publicKey;
    } catch {
      return null;
    }
  }, []);

  const acceptForwardSecrecySession = useCallback(async (chatId: string, remotePublicKey: string): Promise<boolean> => {
    try {
      const hasSession = await hasActiveSession(chatId);
      if (!hasSession) {
        await initSession(chatId);
      }
      const ok = await completeSession(chatId, remotePublicKey);
      if (ok) logger.info('FS session established', { chatId });
      return ok;
    } catch {
      return false;
    }
  }, []);

  const encryptFS = useCallback(async (chatId: string, plaintext: string): Promise<{ ciphertext: string; messageIndex: number } | null> => {
    try {
      return await encryptWithSession(chatId, plaintext);
    } catch {
      return null;
    }
  }, []);

  const decryptFS = useCallback(async (chatId: string, ciphertext: string, messageIndex: number): Promise<string | null> => {
    try {
      return await decryptWithSession(chatId, ciphertext, messageIndex);
    } catch {
      return null;
    }
  }, []);

  const checkActiveSession = useCallback(async (chatId: string): Promise<boolean> => {
    return hasActiveSession(chatId);
  }, []);

  const getLocalSessionKey = useCallback(async (chatId: string): Promise<string | null> => {
    return getSessionPublicKey(chatId);
  }, []);

  const clearCache = useCallback(() => {
    decryptedCacheRef.current = {};
    publicKeyCacheRef.current = {};
  }, []);

  return {
    e2eEnabled,
    isGeneratingKeys,
    initializeKeys,
    getRecipientPublicKey,
    encrypt,
    decrypt,
    sign,
    verify,
    exportUserKeys,
    importUserKeys,
    startForwardSecrecySession,
    acceptForwardSecrecySession,
    encryptFS,
    decryptFS,
    checkActiveSession,
    getLocalSessionKey,
    clearCache,
  };
}
