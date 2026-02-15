/**
 * Sincronização em Background
 * Gerencia fila de mensagens pendentes para sincronização offline
 * 
 * Corrigido: usa navigator.serviceWorker.ready em vez de self.registration
 */

interface PendingMessage {
  id: string;
  chatId: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio';
  mediaUrl?: string;
  timestamp: number;
  retryCount: number;
}

const DB_NAME = 'messages-queue';
const DB_VERSION = 1;
const STORE_NAME = 'pending';
const MAX_RETRIES = 3;

// Cache da conexão DB
let dbInstance: IDBDatabase | null = null;

/**
 * Abrir IndexedDB para fila de mensagens (com cache de conexão)
 */
async function openDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    try {
      // Verificar se a conexão ainda é válida
      dbInstance.transaction([STORE_NAME], 'readonly');
      return dbInstance;
    } catch {
      dbInstance = null;
    }
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      // Limpar cache se conexão for fechada
      dbInstance.onclose = () => { dbInstance = null; };
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('chatId', 'chatId', { unique: false });
      }
    };
  });
}

/**
 * Adicionar mensagem à fila de sincronização
 */
export async function queueMessage(message: Omit<PendingMessage, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
  try {
    const db = await openDB();
    const pendingMessage: PendingMessage = {
      ...message,
      id: `pending-${Date.now()}-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(pendingMessage);

      request.onsuccess = () => {
        // Registrar sync usando navigator.serviceWorker.ready
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then((registration) => {
            if ('sync' in registration) {
              (registration as any).sync.register('sync-messages').catch(() => {
                // Background Sync pode não estar disponível
              });
            }
          }).catch(() => {});
        }
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Erro ao adicionar mensagem à fila:', error);
  }
}

/**
 * Remover mensagem da fila após sincronização bem-sucedida
 */
export async function removeQueuedMessage(messageId: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(messageId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Erro ao remover mensagem da fila:', error);
  }
}

/**
 * Obter todas as mensagens pendentes
 */
export async function getPendingMessages(): Promise<PendingMessage[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Erro ao buscar mensagens pendentes:', error);
    return [];
  }
}

/**
 * Incrementar contador de tentativas
 */
async function incrementRetryCount(messageId: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(messageId);

      getRequest.onsuccess = () => {
        const message = getRequest.result as PendingMessage;
        if (message) {
          message.retryCount += 1;
          const putRequest = store.put(message);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  } catch (error) {
    console.error('Erro ao incrementar contador de tentativas:', error);
  }
}

/**
 * Sincronizar mensagens pendentes
 */
export async function syncPendingMessages(
  sendMessageFn: (message: PendingMessage) => Promise<boolean>
): Promise<{ sent: number; failed: number; dropped: number }> {
  const pending = await getPendingMessages();
  let sent = 0;
  let failed = 0;
  let dropped = 0;
  
  for (const message of pending) {
    if (message.retryCount >= MAX_RETRIES) {
      await removeQueuedMessage(message.id);
      dropped++;
      console.warn(`Mensagem ${message.id} descartada após ${MAX_RETRIES} tentativas`);
      continue;
    }

    try {
      const success = await sendMessageFn(message);
      if (success) {
        await removeQueuedMessage(message.id);
        sent++;
      } else {
        await incrementRetryCount(message.id);
        failed++;
      }
    } catch (error) {
      console.error('Erro ao sincronizar mensagem:', error);
      await incrementRetryCount(message.id);
      failed++;
    }
  }

  return { sent, failed, dropped };
}

/**
 * Verificar se há mensagens pendentes
 */
export async function hasPendingMessages(): Promise<boolean> {
  const pending = await getPendingMessages();
  return pending.length > 0;
}
